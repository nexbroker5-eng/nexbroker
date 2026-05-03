// ============================================================
// NEXTRADE — Firebase Configuration
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyA_xjmjR9iCYss1q_-5Si7UmmEGBOonmoI",
  authDomain: "nexbroker-e89e6.firebaseapp.com",
  projectId: "nexbroker-e89e6",
  storageBucket: "nexbroker-e89e6.firebasestorage.app",
  messagingSenderId: "899239240319",
  appId: "1:899239240319:web:4e937fd7d9d7664517154a"
};

firebase.initializeApp(firebaseConfig);
const db   = firebase.firestore();
const auth = firebase.auth();

// ============================================================
// TRADING INSTRUMENTS
// ============================================================
const INSTRUMENTS = {
  forex: [
    { symbol: 'EUR/USD', name: 'Euro / US Dollar',              pip: 0.0001, defaultPrice: 1.0842 },
    { symbol: 'GBP/USD', name: 'British Pound / US Dollar',     pip: 0.0001, defaultPrice: 1.2674 },
    { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen',      pip: 0.01,   defaultPrice: 149.82 },
    { symbol: 'USD/CHF', name: 'US Dollar / Swiss Franc',       pip: 0.0001, defaultPrice: 0.9012 },
    { symbol: 'AUD/USD', name: 'Australian Dollar / US Dollar', pip: 0.0001, defaultPrice: 0.6521 },
    { symbol: 'USD/CAD', name: 'US Dollar / Canadian Dollar',   pip: 0.0001, defaultPrice: 1.3612 },
    { symbol: 'EUR/GBP', name: 'Euro / British Pound',          pip: 0.0001, defaultPrice: 0.8556 },
    { symbol: 'NZD/USD', name: 'New Zealand Dollar / USD',      pip: 0.0001, defaultPrice: 0.6018 },
  ],
  commodities: [
    { symbol: 'XAU/USD', name: 'Gold / US Dollar',     pip: 0.01, defaultPrice: 2345.00 },
    { symbol: 'XAG/USD', name: 'Silver / US Dollar',   pip: 0.001, defaultPrice: 27.85  },
    { symbol: 'WTI/USD', name: 'Crude Oil (WTI)',       pip: 0.01, defaultPrice: 78.40  },
    { symbol: 'NGAS/USD', name: 'Natural Gas',          pip: 0.001, defaultPrice: 2.145  },
    { symbol: 'XPT/USD', name: 'Platinum / US Dollar', pip: 0.01, defaultPrice: 965.00 },
  ],
  crypto: [
    { symbol: 'BTC/USD', name: 'Bitcoin / US Dollar',   pip: 1,      defaultPrice: 67420  },
    { symbol: 'ETH/USD', name: 'Ethereum / US Dollar',  pip: 0.1,    defaultPrice: 3512   },
    { symbol: 'BNB/USD', name: 'BNB / US Dollar',       pip: 0.01,   defaultPrice: 398.50 },
    { symbol: 'SOL/USD', name: 'Solana / US Dollar',    pip: 0.01,   defaultPrice: 142.30 },
    { symbol: 'XRP/USD', name: 'Ripple / US Dollar',    pip: 0.0001, defaultPrice: 0.5842 },
    { symbol: 'ADA/USD', name: 'Cardano / US Dollar',   pip: 0.0001, defaultPrice: 0.4521 },
    { symbol: 'AVAX/USD', name: 'Avalanche / US Dollar', pip: 0.01,  defaultPrice: 38.20  },
  ]
};

const ALL_INSTRUMENTS = [...INSTRUMENTS.forex, ...INSTRUMENTS.commodities, ...INSTRUMENTS.crypto];

function getInstrument(symbol) {
  return ALL_INSTRUMENTS.find(function(i) { return i.symbol === symbol; }) || null;
}

// ============================================================
// LOAD PRICES FROM FIRESTORE
// Doc IDs use '-' instead of '/' (e.g. BTC-USD, EUR-USD)
// to avoid Firestore invalid path errors.
// The 'symbol' field stores the original symbol (e.g. BTC/USD).
// ============================================================

// ── LIVE PRICE FETCHING (direct from APIs, no admin middleman) ──
// Crypto: CoinGecko (free, no key) — refreshes every 60 seconds
// Forex:  ExchangeRate-API (free key) — refreshes every 60 minutes
// Commodities: static default prices (no free API available)

var EXCHANGE_RATE_KEY = '58ca99f219907848a1573eee';

var CRYPTO_SYMBOLS = {
  'BTC/USD':  'bitcoin',
  'ETH/USD':  'ethereum',
  'BNB/USD':  'binancecoin',
  'SOL/USD':  'solana',
  'XRP/USD':  'ripple',
  'ADA/USD':  'cardano',
  'AVAX/USD': 'avalanche-2'
};

var FOREX_PAIRS = ['EUR/USD','GBP/USD','USD/JPY','USD/CHF','AUD/USD','USD/CAD','EUR/GBP','NZD/USD'];

async function fetchCryptoPrices(pricesObj) {
  try {
    var ids = Object.values(CRYPTO_SYMBOLS).join(',');
    var r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=' + ids + '&vs_currencies=usd');
    if (!r.ok) return;
    var data = await r.json();
    Object.keys(CRYPTO_SYMBOLS).forEach(function(sym) {
      var id = CRYPTO_SYMBOLS[sym];
      if (data[id] && data[id].usd) pricesObj[sym] = parseFloat(data[id].usd);
    });
  } catch(e) { console.error('CoinGecko fetch error:', e); }
}

async function fetchForexPrices(pricesObj) {
  try {
    var r = await fetch('https://v6.exchangerate-api.com/v6/' + EXCHANGE_RATE_KEY + '/latest/USD');
    if (!r.ok) return;
    var data = await r.json();
    if (!data.conversion_rates) return;
    var rates = data.conversion_rates;
    // Convert each pair relative to USD
    if (rates['EUR']) pricesObj['EUR/USD'] = parseFloat((1 / rates['EUR']).toFixed(5));
    if (rates['GBP']) pricesObj['GBP/USD'] = parseFloat((1 / rates['GBP']).toFixed(5));
    if (rates['JPY']) pricesObj['USD/JPY'] = parseFloat(rates['JPY'].toFixed(3));
    if (rates['CHF']) pricesObj['USD/CHF'] = parseFloat(rates['CHF'].toFixed(5));
    if (rates['AUD']) pricesObj['AUD/USD'] = parseFloat((1 / rates['AUD']).toFixed(5));
    if (rates['CAD']) pricesObj['USD/CAD'] = parseFloat(rates['CAD'].toFixed(5));
    if (rates['EUR'] && rates['GBP']) pricesObj['EUR/GBP'] = parseFloat((rates['GBP'] / rates['EUR']).toFixed(5));
    if (rates['NZD']) pricesObj['NZD/USD'] = parseFloat((1 / rates['NZD']).toFixed(5));
  } catch(e) { console.error('ExchangeRate-API fetch error:', e); }
}

async function loadLivePrices(pricesObj) {
  // Set commodity defaults first (no live API)
  ALL_INSTRUMENTS.forEach(function(i) {
    if (!pricesObj[i.symbol]) pricesObj[i.symbol] = i.defaultPrice;
  });
  // Fetch crypto and forex in parallel
  await Promise.all([fetchCryptoPrices(pricesObj), fetchForexPrices(pricesObj)]);
}

// Call this once on page load, then set up intervals
// cryptoCallback and forexCallback are called after each refresh
function startPriceRefresh(pricesObj, onUpdate) {
  // Fetch immediately on load
  loadLivePrices(pricesObj).then(function() { if (onUpdate) onUpdate(); });
  // Crypto: every 60 seconds
  setInterval(function() {
    fetchCryptoPrices(pricesObj).then(function() { if (onUpdate) onUpdate(); });
  }, 60000);
  // Forex: every 60 minutes
  setInterval(function() {
    fetchForexPrices(pricesObj).then(function() { if (onUpdate) onUpdate(); });
  }, 3600000);
}

// ============================================================
// TRADE P&L CALCULATION
// ============================================================
function calcPnL(trade, currentPrice) {
  if (!currentPrice || !trade.entryPrice) return 0;
  var multiplier = trade.symbol.includes('JPY') ? 100 : 10000;
  var cryptoSymbols = ['BTC/USD', 'ETH/USD', 'XRP/USD', 'SOL/USD', 'BNB/USD', 'ADA/USD', 'AVAX/USD'];
  var commoditySymbols = ['XAU/USD', 'XAG/USD', 'WTI/USD', 'NGAS/USD', 'XPT/USD'];
  var isCrypto = cryptoSymbols.includes(trade.symbol);
  var isCommodity = commoditySymbols.includes(trade.symbol);
  var mult = (isCrypto || isCommodity) ? 1 : multiplier;
  var priceDiff = trade.type === 'BUY'
    ? currentPrice - trade.entryPrice
    : trade.entryPrice - currentPrice;
  return parseFloat((priceDiff * trade.lotSize * mult).toFixed(2));
}

// ============================================================
// ACCOUNT ID GENERATION
// ============================================================
async function generateAccountId() {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var id, exists = true;
  while (exists) {
    var rand = '';
    for (var i = 0; i < 8; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    id = 'NXT-' + rand;
    var snap = await db.collection('users').where('accountId', '==', id).limit(1).get();
    exists = !snap.empty;
  }
  return id;
}

// ============================================================
// FORMATTING HELPERS
// ============================================================
function fmtCurrency(n, decimals) {
  decimals = decimals !== undefined ? decimals : 2;
  var num = parseFloat(n) || 0;
  var sign = num < 0 ? '-' : '';
  return sign + '$' + Math.abs(num).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function fmtPrice(price, symbol) {
  var inst = getInstrument(symbol);
  if (!inst) return parseFloat(price).toFixed(4);
  if (symbol === 'BTC/USD') return parseFloat(price).toFixed(2);
  if (['ETH/USD', 'SOL/USD', 'BNB/USD', 'AVAX/USD'].includes(symbol)) return parseFloat(price).toFixed(2);
  if (['XRP/USD', 'ADA/USD'].includes(symbol)) return parseFloat(price).toFixed(4);
  if (symbol.includes('JPY')) return parseFloat(price).toFixed(3);
  if (['XAU/USD', 'XPT/USD', 'WTI/USD'].includes(symbol)) return '$' + parseFloat(price).toFixed(2);
  if (['XAG/USD', 'NGAS/USD'].includes(symbol)) return '$' + parseFloat(price).toFixed(3);
  return parseFloat(price).toFixed(4);
}

function fmtDate(ts) {
  if (!ts) return '--';
  var d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ============================================================
// TOAST
// ============================================================
function showToast(msg, type) {
  type = type || 'success';
  var old = document.querySelector('.nt-toast');
  if (old) old.remove();
  var t = document.createElement('div');
  t.className = 'nt-toast nt-toast--' + type;
  t.innerHTML = '<span>' + msg + '</span>';
  document.body.appendChild(t);
  setTimeout(function() { t.classList.add('show'); }, 10);
  setTimeout(function() { t.classList.remove('show'); setTimeout(function() { t.remove(); }, 300); }, 3500);
}

// ============================================================
// THEME TOGGLE
// ============================================================
function initTheme() {
  var saved = localStorage.getItem('nt-theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  var btn = document.getElementById('themeToggle');
  if (btn) {
    var sunSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
    var moonSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/></svg>';
    btn.innerHTML = saved === 'dark' ? sunSvg : moonSvg;
  }
}

function toggleTheme() {
  var cur = document.documentElement.getAttribute('data-theme');
  var next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('nt-theme', next);
  var btn = document.getElementById('themeToggle');
  if (btn) {
    var sunSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
    var moonSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/></svg>';
    btn.innerHTML = next === 'dark' ? sunSvg : moonSvg;
  }
}

// ============================================================
// AUTH GUARDS
// ============================================================
function requireAuth(callback) {
  auth.onAuthStateChanged(function(user) {
    if (!user) { window.location.href = 'login.html'; return; }
    callback(user);
  });
}

function requireAdmin(callback) {
  auth.onAuthStateChanged(async function(user) {
    if (!user) { window.location.href = 'login.html'; return; }
    try {
      var snap = await db.collection('admins').doc(user.uid).get();
      if (!snap.exists) { window.location.href = 'dashboard.html'; return; }
      callback(user, snap.data());
    } catch(e) {
      console.error('Admin auth check failed:', e);
      var ol = document.getElementById('loadingOverlay');
      if (ol) {
        ol.innerHTML = '<div style="text-align:center;padding:40px;">' +
          '<div style="font-size:1.1rem;font-weight:700;color:#e74c3c;margin-bottom:12px;">Access Error</div>' +
          '<div style="font-size:.85rem;color:#888;max-width:340px;margin:0 auto;">' +
            'Could not verify admin privileges. Check your Firestore security rules and ensure your UID is in the <strong>admins</strong> collection.' +
          '</div>' +
          '<a href="login.html" style="display:inline-block;margin-top:20px;padding:8px 20px;background:#f0b429;color:#111;border-radius:6px;text-decoration:none;font-weight:700;">Back to Login</a>' +
        '</div>';
        ol.style.display = 'flex';
        ol.style.flexDirection = 'column';
        ol.style.justifyContent = 'center';
      }
    }
  });
}

// ============================================================
// SHARED NAV HIGHLIGHT
// ============================================================
function highlightNav() {
  var page = window.location.pathname.split('/').pop();
  document.querySelectorAll('.nav-link').forEach(function(a) {
    if (a.getAttribute('href') === page) a.classList.add('active');
  });
}
