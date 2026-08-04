export interface PersonalData {
  name: string;
  title: string;
  location: string;
  email: string;
  linkedin: string;
  github: string;
}

export interface Stats {
  experience: string;
  team: string;
  college: string;
  hackathon: string;
}

export interface WorkExperience {
  company: string;
  role: string;
  period: string;
  location: string;
  bullets: string[];
  techStack: string[];
}

export interface WeekendProject {
  name: string;
  desc: string;
  tech: string[];
  status: "In Progress" | "Built" | "Exploring";
  highlight?: boolean;
  award?: string;
  link?: string;
}

export interface Skill {
  name: string;
  proficiency: number;
}

export interface SkillCategory {
  category: string;
  items: Skill[];
}

export interface Award {
  name: string;
  company: string;
  context: string;
}

export interface ResumeData {
  personal: PersonalData;
  tagline: string;
  stats: Stats;
  workExperience: WorkExperience[];
  weekendProjects: WeekendProject[];
  skills: SkillCategory[];
  awards: Award[];
}

// Career started July 2019. Experience is recomputed on every load so the
// number ticks up on its own in quarter-year steps: 7+, 7.25, 7.5, 7.75, …
const CAREER_START = new Date(2019, 6, 1); // month is 0-indexed → July 2019

export function computeYearsOfExperience(now: Date = new Date()): number {
  const months =
    (now.getFullYear() - CAREER_START.getFullYear()) * 12 +
    (now.getMonth() - CAREER_START.getMonth());
  // Floor to the nearest quarter-year so we never overstate.
  return Math.max(0, Math.floor(months / 3) / 4);
}

/** Full label, e.g. "7+ Years" (whole) or "7.25 Years" (quarter). */
export function formatExperience(years = computeYearsOfExperience()): string {
  return Number.isInteger(years) ? `${years}+ Years` : `${years} Years`;
}

/** Compact stat form, e.g. "7+" or "7.25". */
export function experienceStatValue(years = computeYearsOfExperience()): string {
  return Number.isInteger(years) ? `${years}+` : `${years}`;
}

export const YEARS_OF_EXPERIENCE = computeYearsOfExperience();

export const RESUME_DATA: ResumeData = {
  personal: {
    name: "Yugam Prasad",
    title: "SDE2 @ DP World",
    location: "Bengaluru, IN",
    email: "yugam.iitkgp@gmail.com",
    linkedin: "in/yugam-15a645126",
    github: "yugam1",
  },
  tagline: "I build something new every weekend using AI",
  stats: {
    experience: formatExperience(),
    team: "15 Members Led",
    college: "IIT Kharagpur",
    hackathon: "1st / 52 Teams",
  },
  workExperience: [
    {
      company: "DP World",
      role: "SDE2",
      period: "Jul 2023 - Present",
      location: "Bengaluru, IN",
      bullets: [
        "Led and mentored a 15-member engineering team, driving delivery alignment, coding standards, and ownership.",
        "Introduced document-driven development, achieving 90%+ unit-test coverage across services.",
        "Built a Rate Management platform unifying freight-transport and location-based service lines, with a multi-modal routing engine stitching sea, rail, and air schedules and a pricing engine for buy/sell/margin/markup.",
        "Introduced Elasticsearch as a read-optimized mirror of Postgres — dual-index routing, ngram prefix search, and zero-downtime reindex via alias swaps with real-time PG→ES sync.",
        "Built a distributed offers pipeline: a Java/Spring Boot core proxies initiate/stream calls to a Node service, streaming vendor offers over SSE with a Kafka + transactional-outbox for exactly-once delivery.",
        "Delivered an SLA workflow layer on Temporal with a role-gated state machine and SQL-aggregated KPI tiles for healthy, nearing-breach, and overdue jobs.",
      ],
      techStack: ["Node.js", "Java", "Spring Boot", "Elasticsearch", "Kafka", "Temporal", "Redis", "PostgreSQL"],
    },
    {
      company: "DP World",
      role: "SDE1",
      period: "Jul 2021 - Jul 2023",
      location: "Bengaluru, IN",
      bullets: [
        "Designed and implemented a core contract module supporting multiple agreement types between parties.",
        "Led development of a subscription module letting clients subscribe to services for defined durations.",
        "Enhanced Quartz-based scheduling to trigger subscription billing on user-defined frequencies.",
        "Won DP World HackPossible 2024 (1st of 52 teams) — an AI-powered logistics quoting MVP combining voice input, contextual understanding, and forecasting, built in React and Node.js.",
      ],
      techStack: ["Java", "Spring Boot", "Quartz", "React", "Node.js", "OpenAI"],
    },
    {
      company: "KPIT",
      role: "Software Engineer",
      period: "Aug 2019 - Jul 2021",
      location: "Pune, IN",
      bullets: [
        "Facilitated Over-the-Air (OTA) updates and remote diagnostics for Jaguar Land Rover, PSA, and Volkswagen.",
        "Implemented UDS/DoIP protocols and ECU flashing sequences in C/C++.",
        "Re-worked the transport layer of KPIT's diagnostics OSI stack to run over serial ports, cutting installation time by 66%.",
        "Simulated ECU networks with Docker virtual networking and exposed a C++ diagnostic API over HTTP via a Flask + Cython wrapper.",
      ],
      techStack: ["C", "C++", "Python", "Cython", "Flask", "Docker"],
    },
    {
      company: "Innoplexus",
      role: "Data Science Intern",
      period: "May 2018 - Jul 2018",
      location: "Pune, IN",
      bullets: [
        "Predicted drug-target success probability in clinical trials using a customized Textual Entailment model and ensemble algorithms.",
        "Built an NLP-driven system to replace traditional IVR flows in call centers.",
        "Implemented Named-Entity Recognition with spaCy and Stanford NER for problem identification in call transcripts. Earned a Pre-Placement Offer (PPO).",
      ],
      techStack: ["Python", "spaCy", "NLP", "Machine Learning"],
    },
  ],
  weekendProjects: [
    {
      name: "Digital Wardrobe 👗",
      desc: "3D virtual try-on mobile app — a rigged mannequin walks a runway wearing your clothes, with garments rebound onto a shared 65-bone skeleton so they deform with the body's live animation. Scan-by-wearing-it, a stylist marketplace, and a social runway feed, all on a clean ports/adapters architecture over a FastAPI backend.",
      tech: ["React Native", "Expo", "Three.js / R3F", "expo-gl", "FastAPI", "Google OAuth"],
      status: "In Progress",
      highlight: true,
    },
    {
      name: "Local RAG & LLM Serving 🧠",
      desc: "Self-hosted RAG pipeline — chunking, embeddings, Qdrant vector store, top-k retrieval, and grounded generation with citations. Ran Ollama inference on GPU, hit the VRAM wall, added hybrid BM25 + vector search with a reranker, and built a 20-question eval harness scored via exact-match and LLM-as-judge.",
      tech: ["Python", "Ollama", "Qdrant", "BM25", "Embeddings"],
      status: "Built",
    },
    {
      name: "Workspace MCP Server 🔌",
      desc: "Custom TypeScript MCP server exposing filesystem, Azure DevOps, and memory tools to Claude Desktop/Code agents — with tool schemas, deferred tool-search, and persistent cross-session memory to drive agentic coding workflows.",
      tech: ["TypeScript", "Node.js", "MCP"],
      status: "Built",
      link: "https://github.com/yugam1",
    },
    {
      name: "AI Logistics Quoting",
      desc: "Voice-input hackathon winner — 1st/52 teams",
      tech: ["Node.js", "React", "OpenAI"],
      status: "Built",
      award: "🏆 Winner",
    },
    {
      name: "MemeDart 🎯",
      desc: "Fun dart scoring app with meme feedback — throws darts, roasts you for missing!",
      tech: ["HTML", "Vanilla JS", "CSS Animations", "Giphy"],
      status: "Built",
      link: "/Memedart/index.html",
    },
    {
      name: "Karaoke App",
      desc: "Cross-platform karaoke app with Bluetooth speaker support and dynamic echo damping",
      tech: ["React Native", "Bluetooth", "Audio Processing"],
      status: "In Progress",
      link: "https://github.com/yugam1/KaraokeApp",
    },
    {
      name: "Inequity Exchange 💹",
      desc: "Trade people like crypto — simulated exchange where you long/short billionaires based on net worth movements, with live tickers, P&L tracking, and shorting mechanics.",
      tech: ["React", "Solidity", "Hardhat", "ethers.js", "ERC-20", "AMM"],
      status: "In Progress",
      link: "/inequity.html",
    },
    {
      name: "DontOpenThis 💌",
      desc: "Cute interactive yes/no message cards with runaway buttons — for when you messed up or just want to be adorable",
      tech: ["HTML", "Vanilla JS", "CSS Animations"],
      status: "Built",
      link: "/DontOpenThis/index.html",
    },
{
      name: "Party Arena 🎯",
      desc: "P2P multiplayer party game platform — WebRTC rooms, zero backend, lazy-loaded game modules, TTS announcer. Games: Deeper Talk, Chaos Deck, Avalon, Ultimate Tic-Tac-Toe",
      tech: ["WebRTC", "PeerJS", "ES Modules", "Web Speech API", "Vanilla JS"],
      status: "Built",
      link: "/party-arena/index.html",
    },
  ],
  skills: [
    {
      category: "Frontend",
      items: [
        { name: "React", proficiency: 8 },
        { name: "Next.js", proficiency: 7 },
        { name: "Tailwind CSS", proficiency: 8 },
        { name: "TypeScript / JavaScript", proficiency: 8 },
      ],
    },
    {
      category: "Backend",
      items: [
        { name: "Java", proficiency: 9 },
        { name: "Spring Boot", proficiency: 9 },
        { name: "Node.js", proficiency: 8 },
        { name: "Python", proficiency: 8 },
      ],
    },
    {
      category: "DevOps & Cloud",
      items: [
        { name: "AWS", proficiency: 7 },
        { name: "Kafka", proficiency: 7 },
        { name: "Redis", proficiency: 7 },
        { name: "Docker", proficiency: 7 },
      ],
    },
    {
      category: "AI & Data",
      items: [
        { name: "OpenAI API", proficiency: 8 },
        { name: "Stable Diffusion", proficiency: 7 },
        { name: "LoRA", proficiency: 6 },
        { name: "Spark", proficiency: 7 },
      ],
    },
  ],
  awards: [
    { name: "Champion Award", company: "DP World", context: "Outstanding performance across teams" },
    { name: "Principle Award", company: "DP World", context: "Recognized for tech leadership" },
    { name: "Hackathon Winner", company: "DP World", context: "HackPossible 2024 — 1st out of 52 teams" },
    { name: "Town Hall Kudos", company: "KPIT", context: "For core backend optimizations" },
    { name: "Pre-Placement Offer (PPO)", company: "Innoplexus", context: "Offered post data-science internship" },
  ],
};
