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

export const RESUME_DATA: ResumeData = {
  personal: {
    name: "Yugam Prasad",
    title: "SDE2 @ DP World",
    location: "Bengaluru, IN",
    email: "yugam.iitkgp@gmail.com",
    linkedin: "in/yugam-prasad",
    github: "yugam66",
  },
  tagline: "I build something new every weekend using AI",
  stats: {
    experience: "6+ Years",
    team: "15 Members Led",
    college: "IIT Kharagpur",
    hackathon: "1st / 52 Teams",
  },
  workExperience: [
    {
      company: "DP World",
      role: "SDE2",
      period: "2023 - Present",
      location: "Bengaluru, IN",
      bullets: [
        "Led cross-functional initiatives and mentored team members.",
        "Architected scalable microservices and integrated modern technologies."
      ],
      techStack: ["Java", "Spring Boot", "React", "AWS"]
    },
    {
      company: "DP World",
      role: "SDE1",
      period: "2021 - 2023",
      location: "Bengaluru, IN",
      bullets: [
        "Developed core backend services and optimized database queries.",
        "Collaborated with product teams to gather requirements and deliver features."
      ],
      techStack: ["Java", "Spring Boot", "SQL"]
    },
    {
      company: "KPIT",
      role: "Software Developer",
      period: "2019 - 2021",
      location: "Bengaluru, IN",
      bullets: [
        "Designed and implemented software components for automotive systems.",
        "Improved system performance and efficiency through code refactoring."
      ],
      techStack: ["C++", "Python", "Embedded Systems"]
    },
    {
      company: "Innoplexus",
      role: "Data Engineer",
      period: "2018 - 2019",
      location: "Pune, IN",
      bullets: [
        "Built robust data pipelines and scraping tools to collect structured data.",
        "Automated data extraction and preprocessing tasks."
      ],
      techStack: ["Python", "Spark", "SQL"]
    }
  ],
  weekendProjects: [
    {
      name: "Digital Wardrobe",
      desc: "AI-powered outfit suggester with vision API",
      tech: ["Spring Boot", "React", "OpenAI Vision", "Redis", "Kafka"],
      status: "In Progress",
      highlight: true,
    },
    {
      name: "AI Logistics Quoting",
      desc: "Voice-input hackathon winner — 1st/52 teams",
      tech: ["Node.js", "React", "OpenAI"],
      status: "Built",
      award: "🏆 Winner",
    },
    {
      name: "Virtual Try-On",
      desc: "Local AI model for wardrobe visualization",
      tech: ["Python", "Stable Diffusion", "LoRA"],
      status: "Exploring",
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
    { name: "Champion Award", context: "Outstanding performance across teams" },
    { name: "Principle Award", context: "Recognized for tech leadership" },
    { name: "Hackathon Winner", context: "1st out of 52 teams" },
    { name: "Town Hall Kudos", context: "For core backend optimizations" },
  ],
};
