import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import {
  SEED_USERS,
  INITIAL_MANUSCRIPTS,
  INITIAL_PRINTER_STATUS,
  INITIAL_SYSTEM_LOGS,
  INITIAL_USAGE_ANALYTICS,
} from './src/data/mockDatabase.js';
import { Manuscript, User, PrinterStatus, SystemLog, PrintJob } from './src/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory persistent state for database simulation
let users = [...SEED_USERS];
let manuscripts: Manuscript[] = [...INITIAL_MANUSCRIPTS];
let printerStatus: PrinterStatus = { ...INITIAL_PRINTER_STATUS };
let systemLogs: SystemLog[] = [...INITIAL_SYSTEM_LOGS];
let usageAnalytics = { ...INITIAL_USAGE_ANALYTICS };

let userBookmarks: Record<string, string[]> = {};
let userHistory: Record<string, { manuscriptId: string; timestamp: string }[]> = {};
let userPrints: Record<string, PrintJob[]> = {};

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

function addLog(level: 'INFO' | 'WARN' | 'ERROR' | 'HPC_EVENT', source: string, message: string, details?: string) {
  const newLog: SystemLog = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toLocaleTimeString(),
    level,
    source,
    message,
    details,
  };
  systemLogs.unshift(newLog);
  if (systemLogs.length > 100) systemLogs.pop();
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '20mb' }));
  app.use(express.static(path.join(process.cwd(), 'public')));

  // --- API ROUTES ---

  // 1. Authentication Endpoint
  app.post('/api/auth/login', (req, res) => {
    const { username, password, isAdmin } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const cleanUsername = String(username).trim();
    const cleanPassword = String(password).trim();

    if (isAdmin) {
      // Admin Login verification
      // Username: admin_group2, Code: 7654
      const adminUser = users.find(
        (u) => u.role === 'admin' && (u.username === cleanUsername || cleanUsername === 'admin_group2')
      );

      if (
        (cleanUsername === 'admin_group2' || (adminUser && adminUser.username === cleanUsername)) &&
        cleanPassword === '7654'
      ) {
        const userObj: User = {
          id: adminUser ? adminUser.id : 'admin-1',
          username: 'admin_group2',
          role: 'admin',
          fullName: adminUser ? adminUser.fullName : 'Faculty Admin Panel (Group 2)',
          email: adminUser ? adminUser.email : 'admin.group2@engineering.univ.edu',
          department: 'Faculty of Engineering & HPC Laboratory',
          bio: 'Supervisory account for R.A.I.J.I.N. Engine HPC Research Kiosk management.',
          profileImage: adminUser?.profileImage || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
        };

        const mockToken = `jwt-admin-${Date.now()}`;
        addLog('INFO', 'JWT Authentication', `Admin login granted for ${userObj.username}`, `Role: admin`);
        return res.json({ token: mockToken, user: userObj });
      } else {
        addLog('WARN', 'JWT Authentication', `Admin login failed for ${cleanUsername}`, `Invalid credentials`);
        return res.status(401).json({ error: 'Invalid admin username or code. Expected admin_group2 / 7654.' });
      }
    } else {
      // Student Login verification
      // Username: Student Number (Ex. 1234), Password: Surname in ALL CAPS (Ex. SMITH)
      const foundUser = users.find(
        (u) =>
          u.role === 'student' &&
          (u.username.toLowerCase() === cleanUsername.toLowerCase() ||
            u.studentNumber?.toLowerCase() === cleanUsername.toLowerCase())
      );

      // Verify surname matches password in ALL CAPS or exact match
      const isPasswordValid =
        foundUser &&
        (foundUser.surname?.toUpperCase() === cleanPassword.toUpperCase() ||
          foundUser.passwordHash.toUpperCase() === cleanPassword.toUpperCase());

      if (foundUser && isPasswordValid) {
        const { passwordHash, ...userObj } = foundUser;
        const mockToken = `jwt-student-${foundUser.id}-${Date.now()}`;
        addLog('INFO', 'JWT Authentication', `Student login granted for Student #${foundUser.studentNumber}`, `User: ${foundUser.fullName}`);
        return res.json({ token: mockToken, user: userObj });
      } else {
        // Fallback for demo: if user types a new student number and a surname in capital letters, auto-register or grant access
        if (/^\d+$/.test(cleanUsername) && cleanPassword === cleanPassword.toUpperCase() && cleanPassword.length >= 2) {
          const newStudent: User & { passwordHash: string } = {
            id: `user-${cleanUsername}`,
            username: cleanUsername,
            studentNumber: cleanUsername,
            surname: cleanPassword,
            passwordHash: cleanPassword,
            fullName: `Student ${cleanUsername}`,
            email: `student.${cleanUsername}@univ.edu`,
            role: 'student',
            department: 'Engineering Department',
            bio: 'Registered Kiosk Student Researcher.',
            profileImage: SEED_USERS[0]?.profileImage || '/spideyman.jpg',
          };
          users.push(newStudent);
          const { passwordHash, ...userObj } = newStudent;
          const mockToken = `jwt-student-${newStudent.id}-${Date.now()}`;
          addLog('INFO', 'JWT Authentication', `New student dynamically registered and authenticated: #${cleanUsername}`, `Surname: ${cleanPassword}`);
          return res.json({ token: mockToken, user: userObj });
        }

        addLog('WARN', 'JWT Authentication', `Student login failed for ID #${cleanUsername}`, `Surname check failed`);
        return res.status(401).json({
          error: 'Invalid Student Number or Surname. Password must be your Surname in ALL CAPS (e.g., 1234 / PARKER).',
        });
      }
    }
  });

  // 2. Profile Updates
  app.put('/api/auth/profile', (req, res) => {
    const { userId, username, fullName, email, bio, profileImage } = req.body;
    const userIndex = users.findIndex((u) => u.id === userId);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (username) users[userIndex].username = username;
    if (fullName) users[userIndex].fullName = fullName;
    if (email) users[userIndex].email = email;
    if (bio !== undefined) users[userIndex].bio = bio;
    if (profileImage) users[userIndex].profileImage = profileImage;

    const { passwordHash, ...updatedUser } = users[userIndex];
    addLog('INFO', 'User Profile', `Updated profile settings for ${updatedUser.fullName}`, `ID: ${userId}`);
    return res.json({ user: updatedUser });
  });

  // 3. Manuscripts Relevancy Search (HPC + RAG Hybrid)
  app.post('/api/manuscripts/search', async (req, res) => {
    try {
      const { query = '', category = 'All', sortBy = 'relevance' } = req.body || {};
      usageAnalytics.totalSearchesToday += 1;

      let filtered = manuscripts.filter((m) => {
        if (category && category !== 'All' && m.category !== category) return false;
        return true;
      });

      const searchKeyword = String(query || '').trim().toLowerCase();

      if (!searchKeyword) {
        // Default return sorted
        return res.json({
          manuscripts: filtered.map((m) => ({ ...m, hpcIndexScore: 0.95 })),
          totalCount: filtered.length,
          latencyMs: 0.28,
        });
      }

      // Keyword filtering & scoring
      let results = filtered.map((m) => {
        let score = 0;
        const titleLower = (m.title || '').toLowerCase();
        const abstractLower = (m.abstract || '').toLowerCase();
        const authorsLower = (m.authors || []).join(' ').toLowerCase();
        const keywordsLower = (m.keywords || []).join(' ').toLowerCase();
        const fullTextLower = (m.fullText || '').toLowerCase();

        if (titleLower.includes(searchKeyword)) score += 50;
        if (keywordsLower.includes(searchKeyword)) score += 35;
        if (abstractLower.includes(searchKeyword)) score += 20;
        if (authorsLower.includes(searchKeyword)) score += 15;
        if (fullTextLower.includes(searchKeyword)) score += 10;

        // Also check individual query words
        const words = searchKeyword.split(/\s+/).filter((w) => w.length > 2);
        words.forEach((word) => {
          if (titleLower.includes(word)) score += 15;
          if (keywordsLower.includes(word)) score += 10;
          if (abstractLower.includes(word)) score += 5;
          if (fullTextLower.includes(word)) score += 2;
        });

        return {
          ...m,
          matchScore: score,
          hpcIndexScore: Math.min(0.99, Number((0.5 + score / 100).toFixed(2))),
        };
      });

      // Filter out zero matches if search query was provided, but if no matches match strictly, fall back to top candidates
      let matchedResults = results.filter((r) => r.matchScore > 0);
      if (matchedResults.length === 0) {
        matchedResults = results; // fallback to show closest literature
      }

      // Sort by match score
      if (sortBy === 'relevance') {
        matchedResults.sort((a, b) => b.matchScore - a.matchScore);
      } else if (sortBy === 'date') {
        matchedResults.sort((a, b) => new Date(b.publicationDate).getTime() - new Date(a.publicationDate).getTime());
      } else if (sortBy === 'views') {
        matchedResults.sort((a, b) => b.views - a.views);
      }

      // Log query in analytics
      if (!usageAnalytics.popularKeywords) usageAnalytics.popularKeywords = [];
      const existingKw = usageAnalytics.popularKeywords.find((k) => k.word.toLowerCase() === searchKeyword);
      if (existingKw) existingKw.count += 1;
      else usageAnalytics.popularKeywords.push({ word: searchKeyword, count: 1 });

      addLog('INFO', 'Literature Search', `Processed search query "${query}"`, `Found ${matchedResults.length} manuscripts`);

      return res.json({
        manuscripts: matchedResults,
        totalCount: matchedResults.length,
        latencyMs: (Math.random() * 0.3 + 0.15).toFixed(2),
      });
    } catch (err: any) {
      console.error('Search error:', err);
      return res.status(500).json({ error: 'Search failed: ' + (err?.message || 'Server error'), manuscripts: [] });
    }
  });

  // 4. RAG AI Assistant for Literature Analysis
  app.post('/api/manuscripts/:id/rag-query', async (req, res) => {
    const { id } = req.params;
    const { userQuestion } = req.body;

    const ms = manuscripts.find((m) => m.id === id);
    if (!ms) return res.status(404).json({ error: 'Manuscript not found' });

    try {
      const prompt = `You are the R.A.I.J.I.N. Engine High-Performance Computing (HPC) Research Kiosk RAG Assistant (Retrieval-Augmented Intelligence for Joint Information Networks). 
Analyze the following engineering manuscript and answer the researcher's query precisely based on the text.

MANUSCRIPT TITLE: ${ms.title}
AUTHORS: ${ms.authors.join(', ')}
CATEGORY: ${ms.category}
ABSTRACT: ${ms.abstract}
FULL TEXT CONTENT:
${ms.fullText}

USER RESEARCH QUESTION:
${userQuestion}

Provide a structured, expert answer referencing equations, formulas, methodology, or results from the literature where appropriate.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
      });

      return res.json({
        answer: response.text || 'Unable to generate response from RAG engine.',
        hpcVectorMatchScore: 0.98,
        retrievedChunks: 4,
      });
    } catch (err: any) {
      console.error('RAG Error:', err);
      return res.status(500).json({ error: 'RAG processing failed: ' + (err?.message || 'Gemini service error') });
    }
  });

  // 5. Admin Upload & Automated PDF Extraction (Gemini powered)
  app.post('/api/manuscripts/upload', async (req, res) => {
    const { fileName, fileContentBase64, rawText, category, overrideTitle, overrideAuthors, overrideAbstract } = req.body;

    let extractedTitle = overrideTitle || '';
    let extractedAuthors = overrideAuthors ? overrideAuthors.split(',') : [];
    let extractedAbstract = overrideAbstract || '';
    let extractedKeywords = ['HPC Grid', 'Research Manuscript'];
    let fullTextToUse = rawText || '';

    // If Gemini API is available and content was uploaded, analyze or refine text extraction
    if (process.env.GEMINI_API_KEY && (fileContentBase64 || rawText)) {
      try {
        const prompt = `You are an automated academic PDF literature indexer for R.A.I.J.I.N. Engine (Retrieval-Augmented Intelligence for Joint Information Networks). 
Extract the Title, Authors (array of strings), Abstract, and 5 key technical Keywords from this engineering document content.
Return JSON with fields: title, authors (array of strings), abstract, keywords (array of strings), category ("Electrical", "Electromechanical", "Mechanical", or "Electronics Communications").

Document Content snippet:
${rawText ? rawText.slice(0, 4000) : fileName}`;

        const extractRes = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                authors: { type: Type.ARRAY, items: { type: Type.STRING } },
                abstract: { type: Type.STRING },
                keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                category: { type: Type.STRING },
              },
            },
          },
        });

        if (extractRes.text) {
          const parsed = JSON.parse(extractRes.text);
          if (!overrideTitle && parsed.title) extractedTitle = parsed.title;
          if ((!overrideAuthors || extractedAuthors.length === 0) && parsed.authors) extractedAuthors = parsed.authors;
          if (!overrideAbstract && parsed.abstract) extractedAbstract = parsed.abstract;
          if (parsed.keywords && parsed.keywords.length > 0) extractedKeywords = parsed.keywords;
        }
      } catch (e) {
        console.warn('PDF Extraction fallback:', e);
      }
    }

    // Default fallbacks
    if (!extractedTitle) extractedTitle = fileName ? fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' ') : 'New Research Manuscript';
    if (!extractedAuthors || extractedAuthors.length === 0) extractedAuthors = ['Faculty Researcher', 'Engineering Dept'];
    if (!extractedAbstract) extractedAbstract = 'Abstract extracted automatically upon manuscript upload to R.A.I.J.I.N. Engine database.';
    if (!fullTextToUse) fullTextToUse = `${extractedTitle}\n\n${extractedAbstract}\n\n1. INTRODUCTION\nUploaded manuscript document ready for literature indexing across R.A.I.J.I.N. HPC grid nodes.`;

    const newManuscript: Manuscript = {
      id: `ms-${Date.now()}`,
      title: extractedTitle,
      authors: extractedAuthors,
      publicationDate: new Date().toISOString().split('T')[0],
      category: category || 'Electrical',
      keywords: extractedKeywords,
      abstract: extractedAbstract,
      fullText: fullTextToUse,
      pdfUrl: `/samples/${fileName || 'manuscript.pdf'}`,
      pdfDataUrl: fileContentBase64 ? (fileContentBase64.startsWith('data:') ? fileContentBase64 : `data:application/pdf;base64,${fileContentBase64}`) : undefined,
      views: 1,
      printsCount: 0,
      uploadedBy: 'admin_group2',
      createdAt: new Date().toISOString(),
      fileSize: fileContentBase64 ? `${(fileContentBase64.length / 1024 / 1024).toFixed(1)} MB` : '2.5 MB',
      pageCount: Math.floor(Math.random() * 8 + 4),
      ragSummary: `Indexed across R.A.I.J.I.N. cluster with keywords: ${extractedKeywords.join(', ')}`,
    };

    manuscripts.unshift(newManuscript);
    usageAnalytics.totalManuscripts += 1;
    addLog('HPC_EVENT', 'Manuscript Indexer', `New manuscript uploaded & indexed: "${extractedTitle}"`, `ID: ${newManuscript.id}`);

    return res.json({ manuscript: newManuscript, message: 'Manuscript successfully uploaded and indexed.' });
  });

  // 6. Admin Manuscript Edit / Delete
  app.put('/api/manuscripts/:id', (req, res) => {
    const { id } = req.params;
    const index = manuscripts.findIndex((m) => m.id === id);
    if (index === -1) return res.status(404).json({ error: 'Manuscript not found' });

    manuscripts[index] = { ...manuscripts[index], ...req.body };
    addLog('INFO', 'Manuscript Admin', `Updated document details for "${manuscripts[index].title}"`);
    return res.json({ manuscript: manuscripts[index] });
  });

  app.delete('/api/manuscripts/:id', (req, res) => {
    const { id } = req.params;
    const ms = manuscripts.find((m) => m.id === id);
    manuscripts = manuscripts.filter((m) => m.id !== id);
    if (ms) addLog('WARN', 'Manuscript Admin', `Deleted manuscript document: "${ms.title}"`);
    return res.json({ success: true, message: 'Manuscript removed.' });
  });

  // 7. Student Bookmarks, History & Print Logs
  app.get('/api/user/:userId/bookmarks', (req, res) => {
    const { userId } = req.params;
    const bookmarkedIds = userBookmarks[userId] || [];
    const bookmarkedList = manuscripts.filter((m) => bookmarkedIds.includes(m.id));
    return res.json({ bookmarks: bookmarkedList });
  });

  app.post('/api/user/:userId/bookmarks', (req, res) => {
    const { userId } = req.params;
    const { manuscriptId } = req.body;
    if (!userBookmarks[userId]) userBookmarks[userId] = [];

    if (!userBookmarks[userId].includes(manuscriptId)) {
      userBookmarks[userId].push(manuscriptId);
      addLog('INFO', 'User Bookmarks', `User ${userId} bookmarked manuscript ${manuscriptId}`);
    }
    return res.json({ bookmarks: userBookmarks[userId] });
  });

  app.delete('/api/user/:userId/bookmarks/:manuscriptId', (req, res) => {
    const { userId, manuscriptId } = req.params;
    if (userBookmarks[userId]) {
      userBookmarks[userId] = userBookmarks[userId].filter((id) => id !== manuscriptId);
    }
    return res.json({ bookmarks: userBookmarks[userId] || [] });
  });

  app.get('/api/user/:userId/history', (req, res) => {
    const { userId } = req.params;
    const historyEntries = userHistory[userId] || [];
    const fullHistory = historyEntries.map((h) => {
      const ms = manuscripts.find((m) => m.id === h.manuscriptId);
      return { ...h, manuscript: ms };
    });
    return res.json({ history: fullHistory });
  });

  app.post('/api/user/:userId/history', (req, res) => {
    const { userId } = req.params;
    const { manuscriptId } = req.body;
    if (!userHistory[userId]) userHistory[userId] = [];

    // Increment views counter
    const ms = manuscripts.find((m) => m.id === manuscriptId);
    if (ms) ms.views += 1;

    userHistory[userId].unshift({ manuscriptId, timestamp: new Date().toISOString() });
    if (userHistory[userId].length > 30) userHistory[userId].pop();

    return res.json({ success: true });
  });

  // 8. Printing Action & Kiosk Hardware Simulation
  app.get('/api/user/:userId/prints', (req, res) => {
    const { userId } = req.params;
    return res.json({ prints: userPrints[userId] || [] });
  });

  app.post('/api/user/:userId/print', (req, res) => {
    const { userId } = req.params;
    const { manuscriptId, bookmarkAlso } = req.body;

    const ms = manuscripts.find((m) => m.id === manuscriptId);
    if (!ms) return res.status(404).json({ error: 'Manuscript not found' });

    // Check paper tray
    if (printerStatus.paperTray.sheetCount < ms.pageCount) {
      return res.status(400).json({ error: 'Printer Error: Insufficient paper in paper tray. Please request faculty refill.' });
    }
    if (!printerStatus.isConnected) {
      return res.status(400).json({ error: 'Printer Error: Printer is currently disconnected from network.' });
    }

    // Deduct paper and ink
    ms.printsCount += 1;
    const pagesPrinted = ms.pageCount || 10;
    printerStatus.paperTray.sheetCount = Math.max(0, printerStatus.paperTray.sheetCount - pagesPrinted);
    
    // Deduct small amount of ink
    printerStatus.inkLevels.black = Math.max(5, Number((printerStatus.inkLevels.black - 0.4).toFixed(1)));
    printerStatus.inkLevels.cyan = Math.max(5, Number((printerStatus.inkLevels.cyan - 0.2).toFixed(1)));
    printerStatus.inkLevels.magenta = Math.max(5, Number((printerStatus.inkLevels.magenta - 0.2).toFixed(1)));
    printerStatus.inkLevels.yellow = Math.max(5, Number((printerStatus.inkLevels.yellow - 0.2).toFixed(1)));

    // Recalculate optical stack height mm (approx 0.1mm per sheet)
    printerStatus.sensorTelemetry.opticalStackHeightMm = Number((printerStatus.paperTray.sheetCount * 0.1).toFixed(1));

    // Create job log
    const user = users.find((u) => u.id === userId);
    const job: PrintJob = {
      id: `job-${Date.now()}`,
      manuscriptId: ms.id,
      manuscriptTitle: ms.title,
      studentId: userId,
      studentName: user ? user.fullName : `Student ${userId}`,
      timestamp: new Date().toISOString(),
      pages: pagesPrinted,
      status: 'Completed',
      inkUsedPercent: 0.8,
    };

    if (!userPrints[userId]) userPrints[userId] = [];
    userPrints[userId].unshift(job);
    usageAnalytics.totalPrintsToday += 1;

    if (bookmarkAlso) {
      if (!userBookmarks[userId]) userBookmarks[userId] = [];
      if (!userBookmarks[userId].includes(manuscriptId)) {
        userBookmarks[userId].push(manuscriptId);
      }
    }

    addLog('INFO', 'Printer Kiosk Daemon', `Print job #${job.id} executed for "${ms.title}" (${pagesPrinted} pages)`, `Student: ${job.studentName}`);

    return res.json({
      success: true,
      job,
      printerStatus,
      message: `Print command sent to ${printerStatus.model}! ${pagesPrinted} pages printed.`,
    });
  });

  // 9. Printer Telemetry & Admin Maintenance
  app.get('/api/printer/status', (req, res) => {
    printerStatus.sensorTelemetry.lastPolledTime = new Date().toLocaleTimeString();
    return res.json({ printerStatus });
  });

  app.post('/api/printer/refill', (req, res) => {
    const { sheets = 250, fillInk } = req.body;
    printerStatus.paperTray.sheetCount = Math.min(500, printerStatus.paperTray.sheetCount + sheets);
    printerStatus.paperTray.hasPaperJam = false;
    printerStatus.paperTray.isTrayOpen = false;
    printerStatus.sensorTelemetry.opticalStackHeightMm = Number((printerStatus.paperTray.sheetCount * 0.1).toFixed(1));

    if (fillInk) {
      printerStatus.inkLevels = { black: 100, cyan: 100, magenta: 100, yellow: 100 };
    }

    addLog('INFO', 'Hardware Maintenance', `Refilled paper tray (+${sheets} sheets). Optical height: ${printerStatus.sensorTelemetry.opticalStackHeightMm}mm`);
    return res.json({ printerStatus });
  });

  app.post('/api/printer/toggle-connection', (req, res) => {
    printerStatus.isConnected = !printerStatus.isConnected;
    addLog(
      printerStatus.isConnected ? 'INFO' : 'WARN',
      'Printer Hardware Daemon',
      `Printer connectivity toggled: ${printerStatus.isConnected ? 'CONNECTED / ONLINE' : 'DISCONNECTED / OFFLINE'}`
    );
    return res.json({ printerStatus });
  });

  // 10. System Logs & Analytics
  app.get('/api/admin/logs', (req, res) => {
    return res.json({ logs: systemLogs });
  });

  app.get('/api/admin/analytics', (req, res) => {
    return res.json({ analytics: usageAnalytics });
  });

  // 11. Catch-all JSON 404 Handler for Unmatched /api/* Endpoints
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.originalUrl}` });
  });

  // 12. Global Express Error Handler (Guarantees JSON error response instead of HTML)
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Express Server Error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err?.message || 'Internal Server Error' });
    }
  });

  // --- VITE MIDDLEWARE SETUP ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
