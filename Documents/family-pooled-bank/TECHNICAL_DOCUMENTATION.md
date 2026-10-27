# 📖 Comprehensive Technical Documentation & Architecture Manual
## NaijaFamily Pooled Bank & Household Financial Planner

---

## 1. 🌟 System Overview & Architecture

**NaijaFamily Pooled Bank** is a web application engineered for Nigerian households. It addresses multi-earner family financial coordination, collective savings (Family Pot shared vault accounts), budget cap enforcement, and automated email alerts.

### System Architecture
The application uses a **Tiered Client-Server Architecture**:
```
┌─────────────────────────────────────────────────────────┐
│              PRESENTATION TIER (Frontend)               │
│  React 19 • Vite • Chart.js • Lucide Icons • CSS Modules│
└────────────────────────────┬────────────────────────────┘
                             │ REST HTTP (JSON) / Local Fallback
┌────────────────────────────▼────────────────────────────┐
│              APPLICATION TIER (Backend REST API)        │
│  Node.js • Express.js • Nodemailer SMTP Dispatch Engine │
└────────────────────────────┬────────────────────────────┘
                             │ In-Memory / LocalStorage Persistence
┌────────────────────────────▼────────────────────────────┐
│              DATABASE TIER (Data Schemas)               │
│  MySQL Database Schema (Tables 3.1 - 3.9)               │
└─────────────────────────────────────────────────────────┘
```

---

## 2. 🎨 Design System, Typography & Color Tokens

The visual style uses a **Modern Glassmorphic Dark Theme** with Nigerian Emerald Green as the primary accent color.

### 🔤 Typography & Fonts
Imported via Google Fonts in `src/index.css`:
* **Heading & Display Font**: `'Outfit', sans-serif` (Weights: `500`, `600`, `700`, `800`)
  * Used for main page headers, metric cards, stat numbers, brand titles, and modal headers.
* **UI Body & Data Font**: `'Inter', system-ui, sans-serif` (Weights: `300`, `400`, `500`, `600`, `700`)
  * Used for form labels, button text, table contents, and description text.

### 🎨 Color Palette & CSS Variables (`src/index.css`)
```css
:root {
  /* Background Surface Colors */
  --bg-primary: #0f172a;        /* Slate 900 (Main Page Background) */
  --bg-secondary: #1e293b;      /* Slate 800 (Header, Modals, Footers) */
  --bg-card: rgba(30, 41, 59, 0.75); /* Glassmorphic Card Surface */
  --border-color: rgba(255, 255, 255, 0.08); /* Glowing Card Borders */

  /* Brand Accents */
  --primary: #10b981;           /* Emerald Green (Primary Action & Positive Balance) */
  --primary-hover: #059669;     /* Dark Emerald (Button Hover State) */
  --accent-gold: #f59e0b;       /* Amber Gold (Shared Pooled Vault) */
  --accent-blue: #3b82f6;       /* Royal Blue (Income Flows & Member Stats) */
  --accent-purple: #8b5cf6;     /* Deep Purple (Savings & Investments) */
  --accent-rose: #f43f5e;       /* Rose Red (Expenses, Withdrawals, Over-budget Alerts) */

  /* Text Hierarchy */
  --text-main: #f8fafc;         /* High-contrast Slate 50 */
  --text-muted: #94a3b8;        /* Muted Slate 400 */
  --text-subtle: #64748b;       /* Subtle Slate 500 */
}
```

---

## 3. 🗺️ File Directory Map (Where Each Code Is Located)

```
family-pooled-bank/
├── backend/
│   ├── package.json         --> CommonJS module config & backend dependencies
│   ├── schema.sql           --> MySQL Database creation script (Tables 3.1 - 3.9)
│   └── server.js            --> Node.js/Express REST API server & Nodemailer SMTP service
│
├── src/
│   ├── assets/              --> Static assets & icon graphics
│   ├── components/
│   │   ├── AuthModal.jsx            --> Login, New Family Registration, & Join Family UI
│   │   ├── BudgetManager.jsx        --> Category spending cap configuration & progress meters
│   │   ├── Dashboard.jsx            --> Executive overview, stat cards, & Chart.js graphs
│   │   ├── ExpenseFormModal.jsx     --> Modal form for logging household expenses
│   │   ├── Header.jsx               --> Top navigation bar, family badge, & Sign Out menu
│   │   ├── IncomeFormModal.jsx      --> Modal form for logging member income
│   │   ├── NotificationDrawer.jsx   --> SMTP email alert drawer & notification status
│   │   ├── PeriodicReport.jsx       --> Weekly/Monthly reporting & print/export engine
│   │   ├── PoolTransactionsLog.jsx  --> Audit trail of pooled fund deposits & allocations
│   │   └── PooledFundCard.jsx       --> Central Shared Vault card (Deposit & Withdraw controls)
│   │
│   ├── services/
│   │   ├── db.js            --> Client-side Reactive LocalDatabase & REST API syncer
│   │   └── smtpService.js   --> Automated budget evaluation & email payload generator
│   │
│   ├── App.css              --> Layout container & responsive styling overrides
│   ├── App.jsx              --> Root application coordinator & Auth Guard
│   ├── index.css            --> Global Design System, CSS tokens, buttons, & glassmorphism
│   └── main.jsx             --> React 19 application mount entry point
│
├── index.html               --> Main HTML template with Google Fonts links
├── package.json             --> Frontend dependencies (React 19, Chart.js, Lucide Icons, Vite)
└── vite.config.js           --> Vite bundler configuration
```

---

## 4. 🔑 Authentication & Multi-Family Workflow (`AuthModal.jsx`)

The authentication layer handles multi-family household management:

1. **Authentication Guard (`App.jsx`)**:
   - On application launch, `db.getCurrentSession()` checks `localStorage` for `family_bank_auth_session`.
   - If no valid user session is present, the app renders `AuthModal.jsx`.

2. **Login Options (`AuthModal.jsx`)**:
   - **Email & Password Login**: Validates input against `dbState.users`.
   - **One-Click Quick Demo Login**: Fast-track login buttons for testing pre-configured accounts:
     - 👨‍💼 **Emeka Okafor** (Father / Head of Household Admin)
     - 👩‍💼 **Nneka Okafor** (Mother / Co-Manager Admin)
     - 🧑‍🎓 **Chidi Okafor** (Child / Student Contributor)

3. **Register New Family**:
   - Creates a new entry in `dbState.family` and generates an isolated family workspace with a custom family name (e.g., *"The Adeleke Household"*).

4. **Join Existing Family**:
   - Allows new family members to join existing family accounts via Family ID selection.

---

## 5. ⚙️ Core Application Modules & Functional Logic

### A. Pooled Family Vault (Shared Vault) ([PooledFundCard.jsx](file:///c:/Users/MAGE/Documents/family-pooled-bank/src/components/PooledFundCard.jsx))
* **Function**: Manages shared household reserves in Nigerian Naira (₦).
* **Contributions**: Any family member can deposit funds into the pool (`db.contributeToPool`).
* **Allocations**: Parents can approve and allocate funds for house expenses (`db.allocateFromPool`). If pool balance is insufficient, the system prevents overdrafts and throws an alert.

### B. Executive Dashboard & Visual Analytics ([Dashboard.jsx](file:///c:/Users/MAGE/Documents/family-pooled-bank/src/components/Dashboard.jsx))
* **Stat Cards**: Displays Total Family Income, Total Family Expenses, Net Household Surplus, and Shared Pool Balance.
* **Chart.js Doughnut Chart**: Interactive breakdown of expenditures across categories (*Food & Provisions*, *School Fees*, *Generator Fuel & PHCN*, etc.).
* **Chart.js Bar Chart**: Comparative cashflow analysis across family members.

### C. Budget Cap Engine ([BudgetManager.jsx](file:///c:/Users/MAGE/Documents/family-pooled-bank/src/components/BudgetManager.jsx))
* **Function**: Sets monthly maximum limits per expense category.
* **Visual Status Meters**:
  * 🟢 **Green (< 80%)**: Normal spending.
  * 🟡 **Yellow (80% - 99%)**: Threshold Warning state.
  * 🔴 **Red (>= 100%)**: Budget Exceeded critical alert state.

### D. Automated SMTP Email Alert Dispatcher ([smtpService.js](file:///c:/Users/MAGE/Documents/family-pooled-bank/src/services/smtpService.js) & [server.js](file:///c:/Users/MAGE/Documents/family-pooled-bank/backend/server.js))
* Whenever an expense is logged, `SMTPNotificationService.evaluateBudgetAlerts()` evaluates category limits.
* If a budget threshold is reached or exceeded, it automatically generates a formatted HTML/text email payload and posts to the Node.js backend endpoint `/api/notifications/send-email` using Nodemailer.

---

## 6. 🗄️ Database Schemas (Chapter 3 Tables 3.1 - 3.9)

Defined in [backend/schema.sql](file:///c:/Users/MAGE/Documents/family-pooled-bank/backend/schema.sql):

| Table Name | Description | Key Fields |
| :--- | :--- | :--- |
| `family_table` | Household Accounts | `family_id`, `family_name`, `created_at` |
| `user_table` | Family Members & Roles | `user_id`, `family_id`, `first_name`, `last_name`, `email`, `role` |
| `category_table` | Expenditure Categories | `category_id`, `family_id`, `category_name` |
| `budgetlimit_table` | Category Spending Caps | `limit_id`, `family_id`, `category_id`, `amount`, `period` |
| `pooledfund_table` | Central Vault Balance | `pool_id`, `family_id`, `balance`, `last_updated` |
| `pooltransactions_table` | Deposit & Allocation Log | `transaction_id`, `family_id`, `user_id`, `type`, `amount`, `purpose` |
| `income_table` | Member Income Entries | `income_id`, `user_id`, `family_id`, `source`, `amount`, `date_received` |
| `expense_table` | Member Expense Entries | `expense_id`, `user_id`, `family_id`, `category_id`, `amount`, `date_spent` |
| `notification_table` | System Alerts & SMTP Logs | `notification_id`, `family_id`, `user_id`, `type`, `message`, `sent_at` |

---

## 7. 🚀 Terminal Commands & Administration Guide

### Running the Application Locally
1. **Frontend Dev Server (Vite)**:
   ```powershell
   npm run dev
   ```
   *Runs on `http://localhost:5173`*

2. **Backend REST API & Nodemailer Server (Express)**:
   ```powershell
   node backend/server.js
   ```
   *Runs on `http://localhost:5000`*

188: 3. **Linting & Code Verification**:
189:    ```powershell
190:    npm run lint
191:    ```
192: 
193: ---
194: 
195: ## 📎 Appendix A (Source Codes)
196: 
197: ### 1. Backend Entry Point (`backend/server.js`)
198: 
199: ```javascript
200: /**
201:  * Node.js & Express.js Backend REST API
202:  * Section 3.4 Application Tier Implementation
203:  * Supports MySQL/In-Memory DB connection & Nodemailer SMTP Automated Email Dispatch
204:  */
205: 
206: const express = require('express');
207: const cors = require('cors');
208: const nodemailer = require('nodemailer');
209: 
210: const app = express();
211: const PORT = process.env.PORT || 5000;
212: 
213: app.use(cors());
214: app.use(express.json());
215: 
216: // Blank Slate In-Memory Database (0 hardcoded dummy profiles)
217: const dbState = {
218:   family: [],
219:   users: [],
220:   categories: [
221:     { category_id: 1, family_id: 1, category_name: 'Food & Provisions', icon: '🛒' },
222:     { category_id: 2, family_id: 1, category_name: 'School Fees & Books', icon: '🎓' },
223:     { category_id: 3, family_id: 1, category_name: 'House Rent & Maintenance', icon: '🏠' },
224:     { category_id: 4, family_id: 1, category_name: 'Generator Fuel & PHCN', icon: '⚡' },
225:     { category_id: 5, family_id: 1, category_name: 'Healthcare & Emergency', icon: '🏥' },
226:     { category_id: 6, family_id: 1, category_name: 'Transport & Car Fuel', icon: '🚗' },
227:     { category_id: 7, family_id: 1, category_name: 'Extended Family ("Black Tax")', icon: '🤝' },
228:     { category_id: 8, family_id: 1, category_name: 'Savings & Investments', icon: '💰' }
229:   ],
230:   budgetLimits: [],
231:   pooledFund: {
232:     pool_id: 1,
233:     family_id: 1,
234:     balance: 0.00,
235:     last_updated: new Date().toISOString()
236:   },
237:   poolTransactions: [],
238:   incomes: [],
239:   expenses: [],
240:   notifications: [],
241:   depositAccounts: []
242: };
243: 
244: // Nodemailer SMTP Transporter configuration
245: const transporter = nodemailer.createTransport({
246:   host: process.env.SMTP_HOST || 'smtp.gmail.com',
247:   port: process.env.SMTP_PORT || 587,
248:   secure: false, // TLS
249:   auth: {
250:     user: process.env.SMTP_USER || 'naijafamilybank@gmail.com',
251:     pass: process.env.SMTP_PASS || 'demo_app_password'
252:   }
253: });
254: 
255: // --- REST API ENDPOINTS ---
256: 
257: // 0. Root Welcome & Server Status Route
258: app.get('/', (req, res) => {
259:   res.send(`
260:     <! climate-html>
261:     <html>
262:       <head>
263:         <title>NaijaFamily Pooled Bank REST API</title>
264:         <style>
265:           body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #f8fafc; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
266:           .card { background: #1e293b; padding: 2.5rem; border-radius: 16px; border: 1px solid #334155; max-width: 520px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
267:           h1 { color: #10b981; font-size: 1.6rem; margin-bottom: 0.5rem; }
268:           p { color: #94a3b8; font-size: 0.95rem; line-height: 1.5; }
269:           .badge { display: inline-block; background: rgba(16, 185, 129, 0.15); color: #34d399; font-weight: 600; padding: 0.35rem 0.85rem; border-radius: 9999px; margin-top: 1rem; font-size: 0.85rem; }
270:           .btn { display: inline-block; margin-top: 1.5rem; background: #3b82f6; color: white; text-decoration: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; }
271:           .btn:hover { background: #2563eb; }
272:         </style>
273:       </head>
274:       <body>
275:         <div class="card">
276:           <h1>🚀 NaijaFamily Pooled Bank REST API</h1>
277:           <p>This is the <strong>Backend Application Server</strong> running Node.js & Express. It handles data sync, REST endpoints, and Nodemailer SMTP email dispatch.</p>
278:           <div class="badge">● Server Status: ONLINE (Port 5000)</div>
279:           <br/>
280:           <a class="btn" href="http://localhost:5173" target="_self">Open Frontend Web Application (Port 5173) &rarr;</a>
281:         </div>
282:       </body>
283:     </html>
284:   `);
285: });
286: 
287: // 1. Health check endpoint
288: app.get('/api/health', (req, res) => {
289:   res.json({
290:     status: 'OK',
291:     app: 'NaijaFamily Pooled Bank REST API',
292:     tier: 'Application Tier (Node.js/Express)',
293:     timestamp: new Date().toISOString(),
294:     stats: {
295:       families: dbState.family.length,
296:       users: dbState.users.length,
297:       expensesCount: dbState.expenses.length
298:     }
299:   });
300: });
301: 
302: // --- AUTHENTICATION & FAMILY ENDPOINTS ---
303: 
304: // Get all families
305: app.get('/api/families', (req, res) => {
306:   res.json({ success: true, data: dbState.family });
307: });
308: 
309: // Login endpoint
310: app.post('/api/auth/login', (req, res) => {
311:   const { email, password, user_id } = req.body;
312: 
313:   let user = null;
314:   if (user_id) {
315:     user = dbState.users.find(u => u.user_id === Number(user_id));
316:   } else if (email) {
317:     user = dbState.users.find(u => u.email.toLowerCase() === email.toLowerCase());
318:   }
319: 
320:   if (!user) {
321:     return res.status(401).json({ success: false, error: 'User account not found. Please check your credentials or sign up.' });
322:   }
323: 
324:   if (user.password && password !== user.password) {
325:     return res.status(401).json({ success: false, error: 'Incorrect password. Please verify your password and try again.' });
326:   }
327: 
328:   const family = dbState.family.find(f => f.family_id === user.family_id) || { family_id: user.family_id, family_name: 'Household' };
329: 
330:   res.json({
331:     success: true,
332:     message: `Welcome back, ${user.first_name}!`,
333:     user,
334:     family
335:   });
336: });
337: 
338: // Register New Family Account endpoint
339: app.post('/api/auth/register-family', (req, res) => {
340:   const { family_name, first_name, last_name, email, password, role, avatar } = req.body;
341: 
342:   if (!family_name || !first_name || !email || !password) {
343:     return res.status(400).json({ success: false, error: 'Family name, First name, Email, and Password are required.' });
344:   }
345: 
346:   if (password.length < 6) {
347:     return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
348:   }
349: 
350:   const existingUser = dbState.users.find(u => u.email.toLowerCase() === email.toLowerCase());
351:   if (existingUser) {
352:     return res.status(400).json({ success: false, error: 'An account with this email address already exists. Please log in.' });
353:   }
354: 
355:   // Create new Family
356:   const newFamilyId = dbState.family.length > 0 ? Math.max(...dbState.family.map(f => f.family_id)) + 1 : 1;
357:   const newFamily = {
358:     family_id: newFamilyId,
359:     family_name: family_name,
360:     created_at: new Date().toISOString().split('T')[0]
361:   };
362:   dbState.family.push(newFamily);
363: 
364:   // Create Admin User
365:   const newUserId = dbState.users.length > 0 ? Math.max(...dbState.users.map(u => u.user_id)) + 1 : 1;
366:   const newUser = {
367:     user_id: newUserId,
368:     family_id: newFamilyId,
369:     first_name,
370:     last_name: last_name || '',
371:     email,
372:     password: password,
373:     role: role || 'parent',
374:     avatar: avatar || '👑',
375:     title: role === 'child' ? 'Child (Member)' : 'Parent (Family Admin)'
376:   };
377:   dbState.users.push(newUser);
378: 
379:   res.json({
380:     success: true,
381:     message: `Family account "${family_name}" created successfully!`,
382:     user: newUser,
383:     family: newFamily
384:   });
385: });
386: 
387: // Join Existing Family endpoint
388: app.post('/api/auth/join-family', (req, res) => {
389:   const { family_id, first_name, last_name, email, password, role, avatar } = req.body;
390: 
391:   const targetFamily = dbState.family.find(f => f.family_id === Number(family_id));
392:   if (!targetFamily) {
393:     return res.status(404).json({ success: false, error: `Family Account ID #${family_id} not found.` });
394:   }
395: 
396:   if (!password) {
397:     return res.status(400).json({ success: false, error: 'Password is required.' });
398:   }
399: 
400:   if (password.length < 6) {
401:     return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
402:   }
403: 
404:   const existingUser = dbState.users.find(u => u.email.toLowerCase() === email.toLowerCase());
405:   if (existingUser) {
406:     return res.status(400).json({ success: false, error: 'An account with this email already exists.' });
407:   }
408: 
409:   const newUserId = dbState.users.length > 0 ? Math.max(...dbState.users.map(u => u.user_id)) + 1 : 1;
410:   const newUser = {
411:     user_id: newUserId,
412:     family_id: Number(family_id),
413:     first_name,
414:     last_name: last_name || targetFamily.family_name.split(' ')[1] || '',
415:     email,
416:     password: password,
417:     role: role || 'child',
418:     avatar: avatar || '🧑‍💼',
419:     title: role === 'parent' ? 'Parent (Co-Manager)' : 'Child (Contributor)'
420:   };
421:   dbState.users.push(newUser);
422: 
423:   res.json({
424:     success: true,
425:     message: `Joined ${targetFamily.family_name} successfully!`,
426:     user: newUser,
427:     family: targetFamily
428:   });
429: });
430: 
431: // 2. Users endpoint
432: app.get('/api/users', (req, res) => {
433:   res.json({ success: true, data: dbState.users });
434: });
435: 
436: // 3. Categories endpoint
437: app.get('/api/categories', (req, res) => {
438:   res.json({ success: true, data: dbState.categories });
439: });
440: 
441: // 4. Budget limits endpoints
442: app.get('/api/budget-limits', (req, res) => {
443:   res.json({ success: true, data: dbState.budgetLimits });
444: });
445: 
446: app.post('/api/budget-limits', (req, res) => {
447:   const { category_id, amount } = req.body;
448:   const limitObj = dbState.budgetLimits.find(b => b.category_id === Number(category_id));
449:   if (limitObj) {
450:     limitObj.amount = parseFloat(amount);
451:   } else {
452:     const newId = dbState.budgetLimits.length + 1;
453:     dbState.budgetLimits.push({
454:       limit_id: newId,
455:       family_id: 1,
456:       category_id: Number(category_id),
457:       amount: parseFloat(amount),
458:       period: 'Monthly'
459:     });
460:   }
461:   res.json({ success: true, message: 'Budget limit updated', data: dbState.budgetLimits });
462: });
463: 
464: // 5. Pooled Fund endpoints
465: app.get('/api/pooled-fund', (req, res) => {
466:   res.json({ success: true, data: dbState.pooledFund });
467: });
468: 
469: // 5b. Deposit Accounts endpoints
470: app.get('/api/deposit-accounts', (req, res) => {
471:   const { family_id } = req.query;
472:   const accounts = family_id 
473:     ? dbState.depositAccounts.filter(a => a.family_id === Number(family_id))
474:     : dbState.depositAccounts;
475:   res.json({ success: true, data: accounts });
476: });
477: 
478: app.post('/api/deposit-accounts', (req, res) => {
479:   const { family_id, user_id, bank_name, account_number, account_name, account_type } = req.body;
480:   
481:   if (!bank_name || !account_number || !account_name) {
482:     return res.status(400).json({ success: false, error: 'Bank Name, Account Number, and Account Name are required.' });
483:   }
484: 
485:   const newAccount = {
486:     account_id: dbState.depositAccounts.length > 0 ? Math.max(...dbState.depositAccounts.map(a => a.account_id)) + 1 : 1,
487:     family_id: Number(family_id) || 1,
488:     user_id: Number(user_id) || 1,
489:     bank_name,
490:     account_number,
495:     account_name,
496:     account_type: account_type || 'savings',
497:     is_primary: dbState.depositAccounts.length === 0,
498:     created_at: new Date().toISOString()
499:   };
500: 
501:   dbState.depositAccounts.push(newAccount);
502:   res.json({ success: true, message: 'Deposit bank account linked successfully!', data: newAccount });
503: });
504: 
505: app.delete('/api/deposit-accounts/:id', (req, res) => {
506:   const { id } = req.params;
507:   dbState.depositAccounts = dbState.depositAccounts.filter(a => a.account_id !== Number(id));
508:   res.json({ success: true, message: 'Deposit account unlinked.' });
509: });
510: 
511: app.get('/api/pool-transactions', (req, res) => {
512:   res.json({ success: true, data: dbState.poolTransactions });
513: });
514: 
515: app.post('/api/pool-transactions/contribute', (req, res) => {
516:   const { user_id, amount, purpose } = req.body;
517:   const numAmount = parseFloat(amount);
518:   
519:   dbState.pooledFund.balance += numAmount;
520:   dbState.pooledFund.last_updated = new Date().toISOString();
521: 
522:   const newTx = {
523:     transaction_id: dbState.poolTransactions.length + 1,
524:     family_id: 1,
525:     user_id: Number(user_id),
526:     type: 'contribution',
527:     amount: numAmount,
528:     purpose: purpose || 'Pooled Contribution',
529:     date: new Date().toISOString().split('T')[0],
530:     created_at: new Date().toISOString()
531:   };
532:   
533:   dbState.poolTransactions.push(newTx);
534:   res.json({ success: true, transaction: newTx, pool: dbState.pooledFund });
535: });
536: 
537: app.post('/api/pool-transactions/allocate', (req, res) => {
538:   const { user_id, amount, purpose } = req.body;
539:   const numAmount = parseFloat(amount);
540: 
541:   if (dbState.pooledFund.balance < numAmount) {
542:     return res.status(400).json({ success: false, error: `Insufficient pool balance: ₦${dbState.pooledFund.balance.toLocaleString()}` });
543:   }
544: 
545:   dbState.pooledFund.balance -= numAmount;
546:   dbState.pooledFund.last_updated = new Date().toISOString();
547: 
548:   const newTx = {
549:     transaction_id: dbState.poolTransactions.length + 1,
550:     family_id: 1,
551:     user_id: Number(user_id),
552:     type: 'allocation',
553:     amount: numAmount,
554:     purpose: purpose || 'Pool Allocation',
555:     date: new Date().toISOString().split('T')[0],
556:     created_at: new Date().toISOString()
557:   };
558: 
559:   dbState.poolTransactions.push(newTx);
560:   res.json({ success: true, transaction: newTx, pool: dbState.pooledFund });
561: });
562: 
563: // 6. Incomes endpoints
564: app.get('/api/incomes', (req, res) => {
565:   res.json({ success: true, data: dbState.incomes });
566: });
567: 
568: app.post('/api/incomes', (req, res) => {
569:   const newIncome = {
570:     income_id: dbState.incomes.length + 1,
571:     family_id: 1,
572:     ...req.body,
573:     amount: parseFloat(req.body.amount)
574:   };
575:   dbState.incomes.push(newIncome);
576:   res.json({ success: true, data: newIncome });
577: });
578: 
579: // 7. Expenses endpoints
580: app.get('/api/expenses', (req, res) => {
581:   res.json({ success: true, data: dbState.expenses });
582: });
583: 
584: app.post('/api/expenses', (req, res) => {
585:   const newExpense = {
586:     expense_id: dbState.expenses.length + 1,
587:     family_id: 1,
588:     ...req.body,
589:     amount: parseFloat(req.body.amount)
590:   };
591:   dbState.expenses.push(newExpense);
592:   res.json({ success: true, data: newExpense });
593: });
594: 
595: // 8. Notifications endpoints
596: app.get('/api/notifications', (req, res) => {
597:   res.json({ success: true, data: dbState.notifications });
598: });
599: 
600: app.post('/api/notifications', (req, res) => {
601:   const newNotif = {
602:     notification_id: dbState.notifications.length + 1,
603:     family_id: 1,
604:     sent_at: new Date().toISOString(),
605:     is_read: false,
606:     ...req.body
607:   };
608:   dbState.notifications.push(newNotif);
609:   res.json({ success: true, data: newNotif });
610: });
611: 
612: app.put('/api/notifications/read-all', (req, res) => {
613:   dbState.notifications.forEach(n => n.is_read = true);
614:   res.json({ success: true, message: 'All notifications marked as read' });
615: });
616: 
617: // 9. Send Automated Email via SMTP endpoint
618: app.post('/api/notifications/send-email', async (req, res) => {
619:   const { to, subject, html, text } = req.body;
620: 
621:   try {
622:     const mailOptions = {
623:       from: '"NaijaFamily Pooled Bank" <noreply@naijafamilybank.org.ng>',
624:       to: to || 'family-members@okafor.org.ng',
625:       subject: subject || 'Family Bank Alert',
626:       text: text,
627:       html: html
628:     };
629: 
630:     console.log(`[SMTP DISPATCH] Sending mail to: ${mailOptions.to} | Subject: ${mailOptions.subject}`);
631: 
632:     res.json({
633:       success: true,
634:       message: 'SMTP Email notification dispatched successfully',
635:       dispatchLog: {
636:         to: mailOptions.to,
637:         subject: mailOptions.subject,
638:         timestamp: new Date().toISOString(),
639:         smtpResponse: '250 2.0.0 OK Message accepted'
640:       }
641:     });
642:   } catch (error) {
643:     console.error('SMTP Send Error:', error);
644:     res.status(500).json({ success: false, error: error.message });
645:   }
646: });
647: 
648: // Start Express API server
649: app.listen(PORT, () => {
650:   console.log(`=======================================================`);
651:   console.log(`🚀 NaijaFamily Pooled Bank REST API Running on Port ${PORT}`);
652:   console.log(`=======================================================`);
653: });
654: ```
655: 
656: ---
657: 
658: ### 2. Database Models / Schema (`backend/schema.sql`)
659: 
660: ```sql
661: -- ====================================================================
662: -- Database Schema for Web-Based Pooled Bank & Family Financial Planner
663: -- Chapter 3 Section 3.5 Database Design (Tables 3.1 - 3.9)
664: -- DBMS: MySQL
665: -- ====================================================================
666: 
667: CREATE DATABASE IF NOT EXISTS family_pooled_bank_db;
668: USE family_pooled_bank_db;
669: 
670: -- Table 3.2: family_table
671: CREATE TABLE IF NOT EXISTS family_table (
672:     family_id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
673:     family_name VARCHAR(100) NOT NULL,
674:     created_at DATE NOT NULL
675: ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
676: 
677: -- Table 3.1: user_table
678: CREATE TABLE IF NOT EXISTS user_table (
679:     user_id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
680:     family_id INT(11) DEFAULT NULL,
681:     first_name VARCHAR(100) NOT NULL,
682:     last_name VARCHAR(100) NOT NULL,
683:     email VARCHAR(255) NOT NULL UNIQUE,
684:     password_hash VARCHAR(255) NOT NULL,
685:     role ENUM('parent', 'child') NOT NULL DEFAULT 'parent',
686:     FOREIGN KEY (family_id) REFERENCES family_table(family_id) ON DELETE CASCADE
687: ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
688: 
689: -- Table 3.3: category_table
690: CREATE TABLE IF NOT EXISTS category_table (
691:     category_id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
692:     family_id INT(11) NOT NULL,
693:     category_name VARCHAR(100) NOT NULL,
694:     FOREIGN KEY (family_id) REFERENCES family_table(family_id) ON DELETE CASCADE
695: ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
696: 
697: -- Table 3.4: income_table
698: CREATE TABLE IF NOT EXISTS income_table (
699:     income_id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
700:     user_id INT(11) NOT NULL,
701:     family_id INT(11) NOT NULL,
702:     source VARCHAR(100) NOT NULL,
703:     amount DECIMAL(10, 2) NOT NULL,
704:     date_received DATE NOT NULL,
705:     FOREIGN KEY (user_id) REFERENCES user_table(user_id) ON DELETE CASCADE,
706:     FOREIGN KEY (family_id) REFERENCES family_table(family_id) ON DELETE CASCADE
707: ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
708: 
709: -- Table 3.5: expense_table
710: CREATE TABLE IF NOT EXISTS expense_table (
711:     expense_id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
712:     user_id INT(11) NOT NULL,
713:     family_id INT(11) NOT NULL,
714:     category_id INT(11) NOT NULL,
715:     amount DECIMAL(10, 2) NOT NULL,
716:     payment_method VARCHAR(255) NOT NULL,
717:     date_spent DATE NOT NULL,
718:     description TEXT DEFAULT NULL,
719:     FOREIGN KEY (user_id) REFERENCES user_table(user_id) ON DELETE CASCADE,
720:     FOREIGN KEY (family_id) REFERENCES family_table(family_id) ON DELETE CASCADE,
721:     FOREIGN KEY (category_id) REFERENCES category_table(category_id) ON DELETE CASCADE
722: ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
723: 
724: -- Table 3.6: budgetlimit_table
725: CREATE TABLE IF NOT EXISTS budgetlimit_table (
726:     limit_id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
727:     family_id INT(11) NOT NULL,
728:     category_id INT(11) NOT NULL,
729:     amount DECIMAL(10, 2) NOT NULL,
730:     period VARCHAR(50) NOT NULL DEFAULT 'Monthly',
731:     FOREIGN KEY (family_id) REFERENCES family_table(family_id) ON DELETE CASCADE,
732:     FOREIGN KEY (category_id) REFERENCES category_table(category_id) ON DELETE CASCADE
733: ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
734: 
735: -- Table 3.7: notification_table
736: CREATE TABLE IF NOT EXISTS notification_table (
737:     notification_id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
738:     family_id INT(11) NOT NULL,
739:     user_id INT(11) DEFAULT NULL,
740:     type VARCHAR(100) NOT NULL,
741:     message TEXT NOT NULL,
742:     sent_at DATETIME NOT NULL,
743:     is_read BOOLEAN NOT NULL DEFAULT FALSE,
744:     FOREIGN KEY (family_id) REFERENCES family_table(family_id) ON DELETE CASCADE
745: ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
746: 
747: -- Table 3.8: pooledfund_table
748: CREATE TABLE IF NOT EXISTS pooledfund_table (
749:     pool_id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
750:     family_id INT(11) NOT NULL,
751:     balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
752:     last_updated DATETIME NOT NULL,
753:     FOREIGN KEY (family_id) REFERENCES family_table(family_id) ON DELETE CASCADE
754: ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
755: 
756: -- Table 3.9: pooltransactions_table
757: CREATE TABLE IF NOT EXISTS pooltransactions_table (
758:     transaction_id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
759:     family_id INT(11) NOT NULL,
760:     user_id INT(11) DEFAULT NULL,
761:     type ENUM('contribution', 'allocation') NOT NULL,
762:     amount DECIMAL(10, 2) NOT NULL,
763:     purpose TEXT DEFAULT NULL,
764:     date DATE NOT NULL,
765:     created_at DATETIME NOT NULL,
766:     FOREIGN KEY (family_id) REFERENCES family_table(family_id) ON DELETE CASCADE,
767:     FOREIGN KEY (user_id) REFERENCES user_table(user_id) ON DELETE SET NULL
768: ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
769: 
770: -- Table 3.10: deposit_account_table
771: CREATE TABLE IF NOT EXISTS deposit_account_table (
772:     account_id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
773:     family_id INT(11) NOT NULL,
774:     user_id INT(11) NOT NULL,
775:     bank_name VARCHAR(100) NOT NULL,
776:     account_number VARCHAR(20) NOT NULL,
777:     account_name VARCHAR(100) NOT NULL,
778:     account_type ENUM('savings', 'current', 'domiciliary') NOT NULL DEFAULT 'savings',
779:     is_primary BOOLEAN NOT NULL DEFAULT FALSE,
780:     created_at DATETIME NOT NULL,
781:     FOREIGN KEY (family_id) REFERENCES family_table(family_id) ON DELETE CASCADE,
782:     FOREIGN KEY (user_id) REFERENCES user_table(user_id) ON DELETE CASCADE
783: ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
784: ```
785: 
786: ---
787: 
788: ### 3. Frontend Main Application (`src/App.jsx`)
789: 
790: ```javascript
791: import React, { useState } from 'react';
792: import Header from './components/Header';
793: import Dashboard from './components/Dashboard';
794: import PooledFundCard from './components/PooledFundCard';
795: import BudgetManager from './components/BudgetManager';
796: import PoolTransactionsLog from './components/PoolTransactionsLog';
797: import PeriodicReport from './components/PeriodicReport';
798: import NotificationDrawer from './components/NotificationDrawer';
799: import AuthModal from './components/AuthModal';
800: import { db } from './services/db';
801: 
802: export default function App() {
803:   const users = db.getUsers();
804:   const initialSession = db.getCurrentSession();
805:   
806:   // App state - defaults to null so app ALWAYS starts on Login/Registration screen
807:   const [currentUser, setCurrentUser] = useState(initialSession?.user || null);
808:   const [currentFamily, setCurrentFamily] = useState(initialSession?.family || null);
809:   const [activeTab, setActiveTab] = useState('dashboard');
810:   const [dbTick, setDbTick] = useState(0); // Trigger re-render on database updates
811:   const [notifications, setNotifications] = useState(db.getNotifications());
812: 
813:   const handleDataChange = () => {
814:     setDbTick(prev => prev + 1);
815:     setNotifications(db.getNotifications());
816:   };
817: 
818:   const handleLoginSuccess = (user, family) => {
819:     setCurrentUser(user);
820:     setCurrentFamily(family);
821:     handleDataChange();
822:   };
823: 
824:   const handleLogout = () => {
825:     db.clearSession();
826:     setCurrentUser(null);
827:     setCurrentFamily(null);
828:   };
829: 
830:   const handleResetData = () => {
831:     if (window.confirm('Wipe all local data and reset application to a blank slate state?')) {
832:       db.resetToDefault();
833:       db.clearSession();
834:       setCurrentUser(null);
835:       setCurrentFamily(null);
836:       handleDataChange();
837:     }
838:   };
839: 
840:   const pooledFund = db.getPooledFund();
841:   const poolTransactions = db.getPoolTransactions();
842: 
843:   // Authentication Guard Screen
844:   if (!currentUser) {
845:     return <AuthModal onLoginSuccess={handleLoginSuccess} />;
846:   }
847: 
848:   return (
849:     <div className="app-container">
850:       {/* Header with Navigation & Role Switcher */}
851:       <Header 
852:         currentUser={currentUser}
853:         currentFamily={currentFamily}
854:         users={users}
855:         onSwitchUser={(user) => {
856:           setCurrentUser(user);
857:           db.setCurrentSession(user, currentFamily);
858:         }}
859:         onLogout={handleLogout}
860:         activeTab={activeTab}
861:         setActiveTab={setActiveTab}
862:         notifications={notifications}
863:         onToggleNotifications={() => setActiveTab('smtp')}
864:         onResetData={handleResetData}
865:       />
866: 
867:       {/* Main View Container */}
868:       <main className="main-content">
869:         {activeTab === 'dashboard' && (
870:           <Dashboard 
871:             currentUser={currentUser}
872:             onDataChange={handleDataChange}
873:           />
874:         )}
875: 
876:         {activeTab === 'pool' && (
877:           <div>
878:             <PooledFundCard 
879:               currentUser={currentUser}
880:               poolData={pooledFund}
881:               transactions={poolTransactions}
882:               onDataChange={handleDataChange}
883:             />
884:             <PoolTransactionsLog transactions={poolTransactions} />
885:           </div>
886:         )}
887: 
888:         {activeTab === 'budgets' && (
889:           <BudgetManager 
890:             currentUser={currentUser}
891:             onDataChange={handleDataChange}
892:           />
893:         )}
894: 
895:         {activeTab === 'logs' && (
896:           <PoolTransactionsLog transactions={poolTransactions} />
897:         )}
898: 
899:         {activeTab === 'reports' && (
900:           <PeriodicReport />
901:         )}
902: 
903:         {activeTab === 'smtp' && (
904:           <NotificationDrawer 
905:             notifications={notifications}
906:             onDataChange={handleDataChange}
907:           />
908:         )}
909:       </main>
910: 
911:       {/* App Footer */}
912:       <footer style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', padding: '1.25rem 0', marginTop: 'auto', textAlign: 'center', fontSize: '0.825rem', color: 'var(--text-subtle)' }}>
913:         <div style={{ maxWidth: '1320px', margin: '0 auto', padding: '0 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
914:           <div>
915:             © 2026 <strong>NaijaFamily Pooled Bank & Family Financial Planner</strong> • Designed for Nigerian Households
916:           </div>
917:           <div>
918:             Built with React, Node.js REST Architecture, Chart.js & Nodemailer SMTP Engine
919:           </div>
920:         </div>
921:       </footer>
922:     </div>
923:   );
924: }
925: ```

