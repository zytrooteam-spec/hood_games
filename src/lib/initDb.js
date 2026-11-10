import bcrypt from 'bcryptjs';
import { getDb } from './mongodb';
import { ROLES } from './auth';
import { sanitizeGameTitle } from './fastDiff';
import { getDefaultWheelConfig } from './wheelConfig';
import { getDefaultVipConfig } from './vipConfig';

let isDbInitialized = false;
let initPromise = null;

export async function ensureDbInitialized() {
  if (isDbInitialized) return true;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const db = await getDb();

      // Ensure MongoDB Indexes
      try {
        if (db && typeof db.collection === 'function') {
          await Promise.allSettled([
            db.collection('users').createIndex({ email: 1 }),
            db.collection('users').createIndex({ username: 1 }),
            db.collection('deposits').createIndex({ status: 1, createdAt: -1 }),
            db.collection('deposits').createIndex({ userId: 1, createdAt: -1 }),
            db.collection('redemptions').createIndex({ status: 1, createdAt: -1 }),
            db.collection('redemptions').createIndex({ userId: 1, createdAt: -1 }),
            db.collection('accountRequests').createIndex({ status: 1, createdAt: -1 }),
            db.collection('accountRequests').createIndex({ userEmail: 1 }),
            db.collection('notifications').createIndex({ target: 1, createdAt: -1 }),
            db.collection('notifications').createIndex({ email: 1, createdAt: -1 }),
            db.collection('subscriptions').createIndex({ email: 1 }),
            db.collection('subscriptions').createIndex({ fcmToken: 1 }),
            db.collection('subscriptions').createIndex({ userId: 1 }),
            db.collection('otps').createIndex({ email: 1 }),
            db.collection('games').createIndex({ isActive: 1 }),
            db.collection('payment_methods').createIndex({ active: 1 }),
            db.collection('ledger').createIndex({ userId: 1, createdAt: -1 }),
            db.collection('chat_messages').createIndex({ userId: 1, createdAt: -1 }),
          ]);
        }
      } catch (idxErr) {
        console.warn('Index initialization note:', idxErr.message);
      }

      // 1. DYNAMIC ADMIN & STAFF SEEDING (Credentials strictly read from ENV, NEVER hardcoded!)
      const usersCol = db.collection('users');
      const adminUsername = process.env.ADMIN_USERNAME || 'admin';
      const adminPassword = process.env.ADMIN_PASSWORD || 'HoodAdmin@2026!';
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@hoodgames.com';

      const staffUsername = process.env.STAFF_USERNAME || 'staff';
      const staffPassword = process.env.STAFF_PASSWORD || 'HoodStaff@2026!';
      const staffEmail = process.env.STAFF_EMAIL || 'staff@hoodgames.com';

      const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
      const staffPasswordHash = await bcrypt.hash(staffPassword, 10);

      // Ensure Super Admin
      await usersCol.updateOne(
        { username: adminUsername },
        {
          $set: {
            username: adminUsername,
            email: adminEmail,
            password: adminPasswordHash,
            role: ROLES.ADMIN,
            isVerified: true,
            balanceSC: 99999.0,
            balanceGC: 1000000,
            status: 'active',
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );

      // Ensure Staff User
      await usersCol.updateOne(
        { username: staffUsername },
        {
          $set: {
            username: staffUsername,
            email: staffEmail,
            password: staffPasswordHash,
            role: ROLES.STAFF,
            isVerified: true,
            balanceSC: 5000.0,
            balanceGC: 100000,
            status: 'active',
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );

      // 2. Default System Settings (Fully dynamic, all editable via Admin Panel)
      const settingsCol = db.collection('system_settings');
      const existingSettings = await settingsCol.findOne({ key: 'general' });
      if (!existingSettings) {
        console.log('Seeding initial system settings for Hood Games...');
        await settingsCol.insertOne({
          key: 'general',
          siteName: 'Hood Games',
          welcomeBonusPercent: 300,
          welcomeBonusTitle: 'HOOD WELCOME MATCH',
          welcomeBonusSubtitle: 'Get a 300% instant match bonus on your first deposit!',
          welcomeBonusActive: true,
          regularBonusPercent: 50,
          regularBonusTitle: 'REGULAR RELOAD BOOST',
          regularBonusSubtitle: 'Get 50% reload on every deposit anytime.',
          regularBonusActive: true,
          referralBonusPercent: 20,
          referralBonusActive: true,
          freeplayAmountSC: 5.0,
          freeplayActive: true,
          minRedemptionSC: 50.0,
          // Sunday Cashback Config (5% - 20% adjustable from Admin)
          cashbackPercent: 10,
          cashbackMinDeposit: 20,
          cashbackActive: true,
          // 5 Dynamic Quick Action Boxes (Adjustable by Admin)
          quickActionCards: [
            {
              id: 'card-1',
              title: 'Instant Deposit',
              subtitle: 'Cash App, Zelle & Crypto with 300% Boost',
              badge: '300% BONUS',
              tab: 'deposit',
              icon: 'Wallet',
              badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40',
              gradient: 'from-[#0a2318] via-[#09142a] to-[#060b17]',
              border: 'border-emerald-500/35 hover:border-emerald-400',
              glow: 'hover:shadow-[0_10px_35px_rgba(44,182,78,0.35)]',
              active: true,
              order: 1,
            },
            {
              id: 'card-2',
              title: 'Redeem & Cashout',
              subtitle: 'Fast Payouts within 15-30 Minutes',
              badge: 'FAST CASHOUT',
              tab: 'withdraw',
              icon: 'ArrowUpRight',
              badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-400/40',
              gradient: 'from-[#0c2448] via-[#09142a] to-[#060b17]',
              border: 'border-blue-500/35 hover:border-blue-400',
              glow: 'hover:shadow-[0_10px_35px_rgba(59,130,246,0.35)]',
              active: true,
              order: 2,
            },
            {
              id: 'card-3',
              title: 'Load Game Credits',
              subtitle: 'Orion, Kirin, Juwa & Milky Way',
              badge: 'INSTANT TRANSFER',
              tab: 'load',
              icon: 'Key',
              badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-400/40',
              gradient: 'from-[#231038] via-[#09142a] to-[#060b17]',
              border: 'border-purple-500/35 hover:border-purple-400',
              glow: 'hover:shadow-[0_10px_35px_rgba(168,85,247,0.35)]',
              active: true,
              order: 3,
            },
            {
              id: 'card-4',
              title: 'Sunday Cashback',
              subtitle: 'Weekly 5%-20% Net Payout Every Sunday',
              badge: 'AUTO REWARD',
              tab: 'cashback',
              icon: 'Sparkles',
              badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
              gradient: 'from-[#2e1d08] via-[#09142a] to-[#060b17]',
              border: 'border-amber-500/35 hover:border-amber-400',
              glow: 'hover:shadow-[0_10px_35px_rgba(245,158,11,0.35)]',
              active: true,
              order: 4,
            },
            {
              id: 'card-5',
              title: 'Daily Free Spin',
              subtitle: 'Spin the Hood Wheel Daily for Free Cash',
              badge: 'FREE PLAY',
              tab: 'spin',
              icon: 'Gift',
              badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40',
              gradient: 'from-[#072533] via-[#09142a] to-[#060b17]',
              border: 'border-cyan-500/35 hover:border-cyan-400',
              glow: 'hover:shadow-[0_10px_35px_rgba(6,182,212,0.35)]',
              active: true,
              order: 5,
            },
          ],
          geoRestrictionEnabled: false,
          restrictedStates: [],
          maintenanceMode: false,
          wheelConfig: getDefaultWheelConfig(),
          vipConfig: getDefaultVipConfig(),
          playerTouchTune: 'marimba',
          adminDefaultAlertTune: 'chaching',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      await settingsCol.updateOne(
        { key: 'general', wheelConfig: { $exists: false } },
        { $set: { wheelConfig: getDefaultWheelConfig(), updatedAt: new Date() } }
      );
      await settingsCol.updateOne(
        { key: 'general', vipConfig: { $exists: false } },
        { $set: { vipConfig: getDefaultVipConfig(), updatedAt: new Date() } }
      );

      // 3. Ensure Default Games Catalog
      const gamesCol = db.collection('games');
      const gamesCount = await gamesCol.countDocuments({});
      if (gamesCount === 0) {
        console.log('Seeding initial games for Hood Games...');
        const defaultGames = [
          {
            id: 'ultra-panda',
            title: 'Ultra Panda',
            category: 'fish',
            isInternal: false,
            platform: 'Ultra Panda',
            playUrl: 'https://ultrapanda.mobi',
            rtp: 98.4,
            rating: 4.95,
            badge: 'HOT',
            image: '',
            description: 'Premier fish shooter game with massive multipliers and bonus jackpots.',
            isActive: true,
            active: true,
            priority: 1,
          },
          {
            id: 'fire-kirin',
            title: 'Fire Kirin',
            category: 'fish',
            isInternal: false,
            platform: 'Fire Kirin',
            playUrl: 'http://firekirin.xyz:8580',
            rtp: 97.9,
            rating: 4.9,
            badge: 'FEATURED',
            image: '',
            description: 'Legendary underwater boss battles and fast arcade fish hunting.',
            isActive: true,
            active: true,
            priority: 2,
          },
          {
            id: 'juwa-777',
            title: 'Juwa 777',
            category: 'sweeps',
            isInternal: false,
            platform: 'Juwa',
            playUrl: 'https://m.juwa777.com',
            rtp: 98.2,
            rating: 4.88,
            badge: 'POPULAR',
            image: '',
            description: 'Top-tier sweeps app featuring Fortune King, Dragon City, and vibrant reels.',
            isActive: true,
            active: true,
            priority: 3,
          },
          {
            id: 'orion-stars',
            title: 'Orion Stars',
            category: 'sweeps',
            isInternal: false,
            platform: 'Orion Stars',
            playUrl: 'http://orionstars.org:8580',
            rtp: 98.1,
            rating: 4.92,
            badge: 'VIP CHOICE',
            image: '',
            description: 'The golden standard in online sweeps reels, fish tables, and keno games.',
            isActive: true,
            active: true,
            priority: 4,
          },
          {
            id: 'game-vault',
            title: 'Game Vault',
            category: 'sweeps',
            isInternal: false,
            platform: 'Game Vault',
            playUrl: 'https://download.gamevault999.com',
            rtp: 97.6,
            rating: 4.85,
            badge: 'HIGH PAYOUT',
            image: '',
            description: 'Explosive bonus rounds with high payouts and thousand concurrent players.',
            isActive: true,
            active: true,
            priority: 5,
          },
          {
            id: 'milky-way',
            title: 'Milky Way',
            category: 'sweeps',
            isInternal: false,
            platform: 'Milky Way App',
            playUrl: 'http://milkywayapp.xyz',
            rtp: 97.4,
            rating: 4.8,
            badge: 'TRENDING',
            image: '',
            description: 'Stellar slot adventures and cosmic fish hunting tables.',
            isActive: true,
            active: true,
            priority: 6,
          },
          {
            id: 'golden-treasure',
            title: 'Golden Treasure',
            category: 'sweeps',
            isInternal: false,
            platform: 'Golden Treasure',
            rtp: 97.7,
            rating: 4.85,
            badge: 'CLASSIC',
            image: '',
            description: 'Classic fish hunter and exciting high-payout reels.',
            isActive: true,
            active: true,
            priority: 7,
          },
        ];
        await gamesCol.insertMany(defaultGames);
      }

      // 4. Default Payment Gateways
      const methodsCol = db.collection('payment_methods');
      const methodsCount = await methodsCol.countDocuments({});
      if (methodsCount === 0) {
        console.log('Seeding initial payment gateways for Hood Games...');
        const defaultMethods = [
          {
            methodId: 'cashapp',
            name: 'Cash App',
            icon: 'DollarSign',
            tag: '$HoodGamesHQ',
            displayName: 'Cash App Pay',
            instructions: 'Send payment with your player username in the note. Instant auto-credit upon verification.',
            minDeposit: 10,
            maxDeposit: 5000,
            minWithdrawal: 25,
            maxWithdrawal: 3000,
            active: true,
            badge: 'MOST POPULAR (INSTANT)',
          },
          {
            methodId: 'zelle',
            name: 'Zelle',
            icon: 'Zap',
            tag: 'pay@hoodgames.com',
            displayName: 'Zelle Direct',
            instructions: 'Send via Zelle to pay@hoodgames.com. Zero fees, instant bank settlement.',
            minDeposit: 20,
            maxDeposit: 5000,
            minWithdrawal: 50,
            maxWithdrawal: 4000,
            active: true,
            badge: 'ZERO FEES',
          },
          {
            methodId: 'crypto',
            name: 'Bitcoin / USDT',
            icon: 'Bitcoin',
            tag: '1HoodGamesCyberWalletBTC777',
            displayName: 'Crypto / BTC / USDT (TRC20)',
            instructions: 'Transfer BTC or USDT. Payouts processed within 5-15 minutes.',
            minDeposit: 20,
            maxDeposit: 10000,
            minWithdrawal: 50,
            maxWithdrawal: 10000,
            active: true,
            badge: '10% EXTRA BONUS',
          },
          {
            methodId: 'chime',
            name: 'Chime',
            icon: 'CreditCard',
            tag: '$HoodGamesPay',
            displayName: 'Chime Spot',
            instructions: 'Send Chime to $HoodGamesPay. Include your username.',
            minDeposit: 10,
            maxDeposit: 2500,
            minWithdrawal: 25,
            maxWithdrawal: 2500,
            active: true,
            badge: 'FAST CASHOUT',
          },
          {
            methodId: 'applepay',
            name: 'Apple Pay / Card',
            icon: 'Smartphone',
            tag: 'apple@hoodgames.com',
            displayName: 'Apple Pay Direct',
            instructions: 'Use Apple Pay via SMS or iMessage request for fast deposit.',
            minDeposit: 15,
            maxDeposit: 2000,
            minWithdrawal: 25,
            maxWithdrawal: 2000,
            active: true,
            badge: '1-TAP PAY',
          },
        ];
        await methodsCol.insertMany(defaultMethods);
      }

      // 5. Default Winners Activity for Ticker (Tied strictly to seeded games)
      const activityCol = db.collection('activity');
      const actCount = await activityCol.countDocuments({});
      if (actCount === 0) {
        const seededGames = await gamesCol.find({}).limit(6).toArray();
        const demoUsers = ['HoodAce77', 'LuckyTrap99', 'KingVibe', 'DiamondBoss', 'ShadowSpin', 'MetroGamer'];
        const demoAmounts = [485.5, 1350.0, 820.0, 560.75, 920.0, 375.0];

        const initialActivities = seededGames.map((g, i) => ({
          username: demoUsers[i % demoUsers.length],
          gameTitle: sanitizeGameTitle(g.title),
          amount: demoAmounts[i % demoAmounts.length],
          currency: 'SC',
          createdAt: new Date(),
        }));
        if (initialActivities.length > 0) {
          await activityCol.insertMany(initialActivities);
        }
      }

      isDbInitialized = true;
      return true;
    } catch (err) {
      console.error('Error during Hood Games database initialization:', err);
      return false;
    }
  })();
  return initPromise;
}
