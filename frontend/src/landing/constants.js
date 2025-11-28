import { MaterialCommunityIcons, Ionicons, Foundation } from '@expo/vector-icons';

export const features = [
  {
    title: "Interest Graveyard",
    description: "See exactly how much interest you've killed. A visual trophy room for your financial wins.",
    icon: <MaterialCommunityIcons name="skull-crossbones" size={32} color="#f43f5e" />,
    color: "#f43f5e20"
  },
  {
    title: "Ghost Mode",
    description: "Go invisible to debt. Automate payments so you never miss a due date, ever again.",
    icon: <MaterialCommunityIcons name="ghost-off" size={32} color="#a855f7" />,
    color: "#a855f720"
  },
  {
    title: "Ninja Score",
    description: "Gamify your credit health. Watch your score climb as you master the art of credit utilization.",
    icon: <Ionicons name="trending-up" size={32} color="#22c55e" />,
    color: "#22c55e20"
  },
  {
    title: "Bank Bounties",
    description: "We track bank rewards and ensure you claim every single rupee you're owed.",
    icon: <MaterialCommunityIcons name="lightning-bolt" size={32} color="#facc15" />,
    color: "#facc1520"
  },
  {
    title: "Stealth Transfer",
    description: "Move money intelligently between accounts to maximize interest-free periods.",
    icon: <MaterialCommunityIcons name="shield-check" size={32} color="#34d399" />,
    color: "#34d39920"
  },
  {
    title: "Dark Balance",
    description: "See your true net worth, minus the liabilities. The only number that actually matters.",
    icon: <Foundation name="lock" size={32} color="#818cf8" />,
    color: "#818cf820"
  }
];

export const steps = [
  {
    number: "01",
    title: "Connect Your Cards",
    description: "Securely link your credit cards via our bank-grade encrypted API. We never store your credentials."
  },
  {
    number: "02",
    title: "Activate Ghost Mode",
    description: "Set your automation preferences. Choose to pay minimums, full balances, or optimize for cash flow."
  },
  {
    number: "03",
    title: "Watch Interest Die",
    description: "Sit back as Lurk handles the payments. Track your savings in the Interest Graveyard."
  }
];

export const testimonials = [
  {
    name: "Arjun Mehta",
    role: "Product Designer",
    content: "I used to pay ₹5k in interest every month just because I forgot dates. Lurk killed that habit instantly. The Interest Graveyard is my favorite feature.",
    initials: "AM"
  },
  {
    name: "Priya Sharma",
    role: "Freelance Developer",
    content: "The 'Ghost Mode' is legit. I don't even think about my credit card bills anymore. It just works in the background. Highly recommended.",
    initials: "PS"
  },
  {
    name: "Rahul Verma",
    role: "Startup Founder",
    content: "Finally, a fintech app that doesn't look like a spreadsheet. The design is stunning, and the utility is unmatched. My Ninja Score is up 50 points.",
    initials: "RV"
  }
];

export const animations = {
  fadeIn: {
    from: { opacity: 0, translateY: 20 },
    to: { opacity: 1, translateY: 0 },
    duration: 500
  },
  scaleIn: {
    from: { scale: 0.9, opacity: 0 },
    to: { scale: 1, opacity: 1 },
    duration: 300
  },
  slideInLeft: {
    from: { translateX: -50, opacity: 0 },
    to: { translateX: 0, opacity: 1 },
    duration: 400
  },
  slideInRight: {
    from: { translateX: 50, opacity: 0 },
    to: { translateX: 0, opacity: 1 },
    duration: 400
  },
  staggerDelay: 100,
  heroDelay: 100,
  heroDuration: 800
};