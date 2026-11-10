/** Default VIP lounge copy — admin can override via system_settings.vipConfig */

export function getDefaultVipConfig() {
  return {
    heroEyebrow: 'Hood Games VIP Club • Privilege Lounge',
    heroTitleHtml:
      'Elevate to VIP Royalty & Earn Up to 20% Cashback',
    heroTitleAccentWords: ['VIP Royalty', '20% Cashback'],
    heroDescription:
      'Welcome to the highest-paying VIP lounge in online sweeps. Enjoy instant payouts, custom high-roller tables, a personal concierge desk, and weekly Sunday cashbacks credited directly to your wallet without wagering hurdles.',
    heroCtaLabel: 'Deposit & Boost VIP Rank',
    statusCashbackRange: '10% - 20% Net',
    tiersHeading: 'VIP Loyalty Tiers',
    tiersSubheading: 'Wager on Orion Stars, Fire Kirin, or Ultra Panda to automatically level up.',
    benefitsEyebrow: 'Guaranteed White-Glove Treatment',
    benefitsHeading: 'Why Play VIP at Hood Games?',
    benefitsSubheading: 'We value high-volume players more than anyone else in the industry.',
    benefitCards: [
      {
        title: 'Guaranteed Sunday Net Cashback',
        body: 'Calculated automatically as (Deposits - Cashouts) × Percentage. Disbursed every Sunday at midnight.',
        icon: 'Coins',
      },
      {
        title: 'Lightning Cashout Priority',
        body: 'Your redemptions skip the regular queue. Receive your Cash App, Chime, Venmo, or Crypto in minutes.',
        icon: 'Zap',
      },
      {
        title: '24/7 Dedicated Concierge',
        body: 'No bots, no waiting. Speak directly with senior floor managers anytime via live chat or private channels.',
        icon: 'Headphones',
      },
    ],
    tiers: [
      {
        id: 'bronze',
        name: 'Bronze Club',
        badge: 'TIER 1',
        color: 'from-amber-700/30 to-amber-900/10 border-amber-600/40 text-amber-400',
        tagColor: 'bg-amber-600/20 text-amber-300 border-amber-500/40',
        turnover: '$0 - $499',
        cashback: '5%',
        spinMultiplier: '1x Daily',
        withdrawalSpeed: 'Standard (1-2 hrs)',
        features: [
          '5% Sunday Net Loss Cashback',
          'Daily Free Wheel Spin (1x)',
          'Standard Telegram / Chat Support',
          'Official Sweepstakes Verification',
        ],
      },
      {
        id: 'silver',
        name: 'Silver Elite',
        badge: 'TIER 2',
        color: 'from-slate-400/25 to-slate-700/10 border-slate-400/40 text-slate-200',
        tagColor: 'bg-slate-400/20 text-slate-200 border-slate-400/40',
        turnover: '$500 - $1,999',
        cashback: '8%',
        spinMultiplier: '2x Daily',
        withdrawalSpeed: 'Priority (< 45 mins)',
        features: [
          '8% Sunday Net Loss Cashback',
          'Daily Free Wheel Spin (2x)',
          'Fast-track Cashout Queue',
          'Monthly Level-Up Bonus ($25 SC)',
          'Priority Live Support',
        ],
      },
      {
        id: 'gold',
        name: 'Gold Master',
        badge: 'POPULAR VIP',
        color: 'from-yellow-500/25 to-amber-700/15 border-yellow-500/50 text-yellow-300 ring-2 ring-yellow-500/30',
        tagColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
        turnover: '$2,000 - $4,999',
        cashback: '12%',
        spinMultiplier: '3x Daily',
        withdrawalSpeed: 'Express (< 15 mins)',
        popular: true,
        features: [
          '12% Sunday Net Loss Cashback',
          'Daily Free Wheel Spin (3x)',
          'Express Cashout Processing (< 15 mins)',
          'Dedicated VIP Account Representative',
          '$100 Birthday Bonus & Custom Reloads',
          'Exclusive High-RTP Game Rooms',
        ],
      },
      {
        id: 'platinum',
        name: 'Platinum High-Roller',
        badge: 'HIGH STAKES',
        color: 'from-cyan-500/25 to-blue-700/15 border-cyan-400/50 text-cyan-300',
        tagColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        turnover: '$5,000 - $14,999',
        cashback: '15%',
        spinMultiplier: 'Unlimited Free Spins',
        withdrawalSpeed: 'Instant (< 5 mins)',
        features: [
          '15% Sunday Net Loss Cashback',
          'Instant Automated Redemptions',
          'Zero Withdrawal Caps & Fees',
          'Personal VIP Concierge Desk (WhatsApp/Call)',
          '$300 Level-Up Reward + Luxury Swag Pack',
          'Customized Reload Match Deals',
        ],
      },
      {
        id: 'diamond',
        name: 'Diamond Royale',
        badge: 'ELITE PRESTIGE',
        color: 'from-purple-500/25 to-pink-700/15 border-purple-400/50 text-purple-300',
        tagColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        turnover: '$15,000 - $49,999',
        cashback: '18%',
        spinMultiplier: 'Mega Wheel Access',
        withdrawalSpeed: 'Instant Under 3 Mins',
        features: [
          '18% Sunday Net Loss Cashback',
          'Mega Jackpot Wheel Access ($500+ Prizes)',
          'Instant Priority Wire & Crypto Settlement',
          '24/7 Dedicated Senior Concierge Host',
          '$1,000 Seasonal Cash Credits',
          'Private High-Limit Sweeps Servers',
        ],
      },
      {
        id: 'black',
        name: 'Black Crown',
        badge: 'BY INVITATION',
        color: 'from-emerald-500/20 via-[#0a1f3d] to-black/80 border-[#2cb64e]/60 text-[#2cb64e]',
        tagColor: 'bg-[#2cb64e]/20 text-[#2cb64e] border-[#2cb64e]/40',
        turnover: '$50,000+',
        cashback: '20% MAXIMUM',
        spinMultiplier: 'Guaranteed Jackpots',
        withdrawalSpeed: 'Direct VIP Wire',
        features: [
          '20% MAXIMUM Net Loss Sunday Cashback',
          'Uncapped Redemptions Anytime',
          'Direct Private WhatsApp with Casino GM',
          'All-Expenses-Paid Vegas Hospitality Trips',
          'Custom Tailored Rebate & Crypto Rates',
        ],
      },
    ],
  };
}

export function resolveVipConfig(settings) {
  const defaults = getDefaultVipConfig();
  const fromDb = settings?.vipConfig;
  if (!fromDb || typeof fromDb !== 'object') return defaults;
  return {
    ...defaults,
    ...fromDb,
    tiers: Array.isArray(fromDb.tiers) && fromDb.tiers.length > 0 ? fromDb.tiers : defaults.tiers,
    benefitCards:
      Array.isArray(fromDb.benefitCards) && fromDb.benefitCards.length > 0
        ? fromDb.benefitCards
        : defaults.benefitCards,
  };
}
