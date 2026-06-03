import type { Product } from "@shared/schema";

function detectCategoryFromKeyword(keyword: string): string {
  const kw = keyword.toLowerCase();
  if (kw.includes("pharmacol") || kw.includes("drug") || kw.includes("medication")) return "Pharmacology";
  if (kw.includes("pediatric") || kw.includes("child") || kw.includes("infant")) return "Pediatrics";
  if (kw.includes("maternal") || kw.includes("maternity") || kw.includes("obstet") || kw.includes("newborn") || kw.includes("prenatal")) return "Maternal & Newborn";
  if (kw.includes("mental health") || kw.includes("psychiatr") || kw.includes("psychology")) return "Psychology & Mental Health";
  if (kw.includes("anatomy") || kw.includes("physiology") || kw.includes("a&p")) return "Anatomy & Physiology";
  if (kw.includes("medical-surgical") || kw.includes("med-surg") || kw.includes("medical surgical")) return "Medical-Surgical";
  if (kw.includes("pathophysiology") || kw.includes("pathology")) return "Pathophysiology";
  if (kw.includes("fundamentals") || kw.includes("basic nursing")) return "Fundamentals";
  if (kw.includes("leadership") || kw.includes("management") || kw.includes("delegation")) return "Leadership & Management";
  if (kw.includes("community") || kw.includes("public health") || kw.includes("population")) return "Public Health";
  if (kw.includes("radiology") || kw.includes("imaging") || kw.includes("radiolog")) return "Radiology";
  if (kw.includes("immunology") || kw.includes("immune")) return "Immunology";
  if (kw.includes("laboratory") || kw.includes("lab test")) return "Laboratory";
  if (kw.includes("nclex") || kw.includes("test bank") || kw.includes("practice question") || kw.includes("exam prep")) return "Test Banks";
  return "Nursing";
}

function getStudyTopicsForKeyword(keyword: string, category: string): string[] {
  const base = getTopicsForCategory(category);
  return base;
}

function generateFAQsForKeyword(keyword: string): { q: string; a: string }[] {
  return [
    {
      q: `What is the best way to study for a ${keyword} exam?`,
      a: `The most effective approach combines regular practice with exam-style questions, spaced repetition of key concepts, and reviewing detailed answer rationales. Using a comprehensive test bank aligned to your specific course is proven to improve exam scores significantly.`
    },
    {
      q: `How many practice questions should I complete when preparing for ${keyword}?`,
      a: `Aim for at least 200–500 practice questions covering all major topic areas. Focus on quality over quantity — review every rationale carefully, especially for questions you answered incorrectly. Our test bank provides hundreds of questions with detailed explanations.`
    },
    {
      q: `Are test banks effective for ${keyword} exam preparation?`,
      a: `Yes — test banks are one of the most evidence-based study tools available. They mirror actual exam formats, expose you to a wide range of question types, and help identify knowledge gaps before the real exam.`
    },
    {
      q: `How quickly will I receive my study materials after purchase?`,
      a: `Instantly! All our test banks are digital downloads. As soon as your payment is confirmed, you'll receive a download link and confirmation email so you can start studying right away.`
    }
  ];
}

export function generateBlogPostFromKeyword(keyword: string, category?: string): GeneratedBlogPost {
  const detectedCategory = category || detectCategoryFromKeyword(keyword);
  const topics = getStudyTopicsForKeyword(keyword, detectedCategory);
  const faqs = generateFAQsForKeyword(keyword);

  const titleVariants = [
    `${keyword.charAt(0).toUpperCase() + keyword.slice(1)}: Complete Study Guide & Practice Questions`,
    `How to Master ${keyword.charAt(0).toUpperCase() + keyword.slice(1)}: Proven Exam Strategies`,
    `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} Study Guide: Everything You Need to Pass`,
  ];
  const blogTitle = titleVariants[Math.floor(Math.random() * titleVariants.length)];

  const slug = slugify(keyword) + "-guide-" + Date.now().toString(36);
  const excerpt = `Everything you need to know about ${keyword}. Discover proven study strategies, essential topics, and high-yield practice questions to help you pass your nursing exam with confidence.`;

  const topicsList = topics
    .map(t => `<li><strong>${t.charAt(0).toUpperCase() + t.slice(1)}</strong>: A high-yield area that frequently appears on nursing examinations and requires solid foundational understanding.</li>`)
    .join("\n");

  const faqHtml = faqs.map(f => `
<h3>${f.q}</h3>
<p>${f.a}</p>`).join("\n");

  const content = `
<h2>Introduction to ${keyword.charAt(0).toUpperCase() + keyword.slice(1)}</h2>
<p>If you're preparing for a ${detectedCategory.toLowerCase()} examination that covers <strong>${keyword}</strong>, you're in the right place. This comprehensive study guide breaks down everything you need to know — from the core concepts you'll be tested on, to the most effective study strategies that top-performing nursing students use.</p>
<p>Whether you're working toward your NCLEX, a course final, or a specialty certification, understanding ${keyword} deeply is essential for both your exam and your clinical practice. The good news? With the right preparation tools and strategies, this material is absolutely achievable.</p>
<p>In this guide, we'll walk through the high-yield topics, science-backed study methods, and how a comprehensive test bank can take your preparation to the next level.</p>

<h2>Why ${keyword.charAt(0).toUpperCase() + keyword.slice(1)} Is Critical for Nursing Exams</h2>
<p>${detectedCategory} is one of the most commonly tested areas in nursing education. Questions on ${keyword} test not just your knowledge of facts, but your ability to apply concepts in realistic clinical scenarios — exactly the kind of critical thinking that nursing exams demand.</p>
<p>Nursing boards and faculty design exams around real patient care situations. That means studying ${keyword} means understanding:</p>
<ul>
<li>The underlying <strong>pathophysiology or pharmacology</strong> driving clinical decisions</li>
<li>How to <strong>prioritize nursing actions</strong> in time-sensitive situations</li>
<li>Evidence-based <strong>interventions and patient education</strong> strategies</li>
<li>Common complications, contraindications, and <strong>safety considerations</strong></li>
</ul>

<h2>High-Yield Topics to Master</h2>
<p>When studying ${keyword}, focus your energy on these essential areas that are most frequently tested:</p>
<ul>
${topicsList}
</ul>
<p>Don't try to memorize everything at once. Use active recall — after reviewing each topic, close your notes and try to recall the key points from memory. Then practice applying each concept with exam-style questions.</p>

<h2>Proven Study Strategies for ${detectedCategory} Exams</h2>

<h3>1. Practice with Exam-Style Questions Daily</h3>
<p>The single most effective thing you can do is practice with questions that mirror the actual exam format. Aim for 30–50 questions per study session. For each question:</p>
<ul>
<li>Read <strong>all answer choices</strong> before selecting one</li>
<li>Eliminate obviously wrong answers first</li>
<li>Apply the nursing process: Assessment → Diagnosis → Planning → Implementation → Evaluation</li>
<li>Read the <strong>rationale for every answer</strong>, not just the ones you got wrong</li>
</ul>

<h3>2. Use Spaced Repetition</h3>
<p>Spaced repetition is scientifically proven to improve long-term retention. Instead of cramming, spread your study sessions out:</p>
<ul>
<li><strong>Daily</strong>: 30–50 practice questions covering mixed topics</li>
<li><strong>Weekly</strong>: Full chapter reviews and targeted weak-area work</li>
<li><strong>Pre-exam week</strong>: Full timed practice tests under exam conditions</li>
</ul>

<h3>3. Build Clinical Connections</h3>
<p>For every concept related to ${keyword}, ask yourself: "How would this look in a real patient situation?" Connecting textbook knowledge to clinical scenarios helps you answer application-level questions — the most common type on nursing exams.</p>

<h3>4. Identify and Target Weak Areas</h3>
<p>Track your performance across different topic areas. If you consistently score below 70% in a particular area, dedicate extra study time there before your exam. A quality test bank gives you detailed feedback so you can study smarter, not longer.</p>

<h2>How Our Test Bank Helps You Master ${keyword.charAt(0).toUpperCase() + keyword.slice(1)}</h2>
<p>Our nursing test banks are designed by experienced educators and clinicians to give you the most realistic exam preparation possible:</p>
<ul>
<li>✅ <strong>Hundreds of NCLEX-style questions</strong> covering ${keyword} and related topics</li>
<li>✅ <strong>Detailed rationale explanations</strong> for every answer choice — not just the correct one</li>
<li>✅ <strong>Multiple question formats</strong>: multiple choice, select-all-that-apply, ordered response, and case studies</li>
<li>✅ <strong>Instant digital download</strong> — start studying within minutes of purchase</li>
<li>✅ <strong>Organized by chapter and topic</strong> so you can study systematically or target specific areas</li>
<li>✅ <strong>30-day money-back guarantee</strong> — if you're not satisfied, we'll refund you</li>
</ul>

<h2>Frequently Asked Questions</h2>
${faqHtml}

<h2>Start Your ${keyword.charAt(0).toUpperCase() + keyword.slice(1)} Preparation Today</h2>
<p>Success in your nursing exam comes down to consistent practice, smart studying, and using the right resources. The more exam-style questions you work through — and the more carefully you review the rationales — the more confident and prepared you'll feel on exam day.</p>
<p>Browse our complete collection of nursing test banks, study guides, and practice question sets to find the perfect resource for your exam preparation.</p>
<p><a href="/shop" class="cta-link">Browse All Test Banks & Study Guides →</a></p>
  `.trim();

  const metaTitle = `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} Study Guide | Testbankbooks`;
  const metaDescription = `Master ${keyword} with our comprehensive study guide and practice questions. Proven exam strategies, high-yield topics, and instant-download test banks for nursing students.`;

  return {
    slug,
    title: blogTitle,
    excerpt,
    content,
    metaTitle,
    metaDescription,
    category: detectedCategory,
  };
}

function getTopicsForCategory(category: string): string[] {
  const topics: Record<string, string[]> = {
    "Nursing": ["nursing process and care planning", "patient assessment and vital signs", "clinical judgment and decision-making", "therapeutic communication", "medication administration"],
    "Anatomy & Physiology": ["body system structure and function", "cellular biology and genetics", "organ physiology and homeostasis", "physiological regulation", "clinical correlations"],
    "Pharmacology": ["drug classifications and mechanisms", "dosage calculations and administration", "drug interactions and contraindications", "adverse effects and toxicity", "patient education for medications"],
    "Psychology & Mental Health": ["mental health disorders and DSM criteria", "therapeutic communication techniques", "psychiatric medications and side effects", "behavioral interventions", "crisis assessment and intervention"],
    "Pathophysiology": ["disease mechanisms and pathology", "cellular and tissue pathology", "organ system dysfunction", "inflammatory and immune responses", "clinical manifestations and treatment"],
    "Pediatrics": ["child growth and development", "pediatric assessment techniques", "common childhood illnesses", "family-centered nursing care", "pediatric pharmacology and dosing"],
    "Maternal & Newborn": ["antepartum and prenatal care", "labor, delivery, and complications", "postpartum assessment and care", "newborn transition and assessment", "high-risk pregnancy management"],
    "Medical-Surgical": ["acute and chronic adult health conditions", "perioperative nursing care", "preoperative and postoperative management", "medical-surgical interventions", "complex care coordination"],
    "Fundamentals": ["fundamental nursing skills and techniques", "infection prevention and control", "safe medication administration", "patient safety and fall prevention", "documentation and reporting"],
    "Leadership & Management": ["nursing leadership styles", "quality improvement and patient safety", "delegation and prioritization", "healthcare team management", "nursing ethics and legal issues"],
    "Public Health": ["community and population health", "epidemiology and disease surveillance", "health promotion and disease prevention", "environmental health factors", "health policy and advocacy"],
    "Radiology": ["imaging modalities and indications", "radiological interpretation basics", "radiation safety and protection", "contrast agents and reactions", "diagnostic imaging procedures"],
    "Immunology": ["immune system structure and function", "immunological disorders and responses", "vaccines and immunization", "hypersensitivity reactions", "autoimmune conditions"],
    "Laboratory": ["laboratory test interpretation", "blood transfusion safety", "specimen collection procedures", "critical values and nursing actions", "diagnostic testing"],
    "Test Banks": ["comprehensive exam-style questions", "NCLEX-style question strategies", "evidence-based practice", "clinical reasoning and judgment", "test-taking strategies"],
  };
  return topics[category] || topics["Test Banks"];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 200);
}

export interface GeneratedBlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
  category: string;
}

export function generateBlogPostForProduct(product: Product): GeneratedBlogPost {
  const topics = getTopicsForCategory(product.category || "Test Banks");
  const productTitle = product.title;
  const category = product.category || "Nursing";
  const price = product.salePrice
    ? parseFloat(product.salePrice)
    : parseFloat(product.price);

  const blogTitle = `How to Ace Your ${productTitle} Exam: A Complete Study Guide`;
  const slug = slugify(productTitle) + "-study-guide";
  const excerpt = `Preparing for your ${productTitle} exam? Discover proven study strategies, key topics, and how our comprehensive test bank can help you achieve top marks.`;

  const topicsList = topics
    .map(
      (t) =>
        `<li><strong>${t.charAt(0).toUpperCase() + t.slice(1)}</strong>: Understanding core concepts and their clinical applications</li>`
    )
    .join("\n");

  const content = `
<h2>Introduction</h2>
<p>Preparing for your <strong>${productTitle}</strong> exam requires a strategic approach and access to the right study materials. Whether you're a nursing student facing your first major examination or a healthcare professional seeking to advance your credentials, having a comprehensive test bank is essential for exam success.</p>
<p>In this guide, we'll walk you through effective study strategies, key topics you need to master, and how to make the most of your study time.</p>

<h2>Key Topics You'll Master</h2>
<p>When studying for your ${productTitle} exam, you'll need to develop a thorough understanding of these essential areas:</p>
<ul>
${topicsList}
</ul>
<p>Each of these areas is tested extensively in ${category} examinations, and our test bank includes comprehensive question sets covering every major topic.</p>

<h2>Proven Study Strategies</h2>

<h3>1. Start with the Basics</h3>
<p>Begin your study sessions by reviewing fundamental concepts before moving to more complex material. Build a solid foundation in basic principles that underpin all ${category.toLowerCase()} knowledge.</p>

<h3>2. Practice with Exam-Style Questions</h3>
<p>One of the most effective ways to prepare for any nursing or healthcare exam is to practice with questions that mirror the actual exam format. Our test bank provides:</p>
<ul>
<li><strong>Hundreds of exam-style questions</strong> covering every chapter and topic</li>
<li><strong>Detailed rationale explanations</strong> for every answer choice</li>
<li><strong>Multiple question types</strong> including multiple-choice, select-all-that-apply, and case studies</li>
<li><strong>Questions organized by difficulty level</strong> to help you progress systematically</li>
</ul>

<h3>3. Focus on Clinical Applications</h3>
<p>Don't just memorize facts — understand how to apply them in clinical scenarios. Our test bank emphasizes real-world application, helping you develop the critical thinking skills that are essential for both exams and professional practice.</p>

<h3>4. Use Spaced Repetition</h3>
<p>Spaced repetition is scientifically proven to improve long-term retention. Schedule regular review sessions rather than cramming at the last minute:</p>
<ul>
<li><strong>Daily</strong>: Review 20–30 questions from different topics</li>
<li><strong>Weekly</strong>: Complete full chapter reviews and identify weak areas</li>
<li><strong>Pre-exam</strong>: Take full practice sets under timed conditions</li>
</ul>

<h3>5. Track Your Progress</h3>
<p>Keep a study log to monitor your performance across different topic areas. Focus additional time on sections where your scores are consistently lower. This targeted approach maximizes your study efficiency.</p>

<h2>Why Use the ${productTitle} Test Bank?</h2>
<p>Our test bank is specifically designed to help nursing and healthcare students succeed in their examinations:</p>
<ul>
<li>✅ <strong>Comprehensive Coverage</strong>: Every chapter and topic from your textbook is covered with multiple question types</li>
<li>✅ <strong>Instant Download</strong>: Access your study materials immediately after purchase — no waiting</li>
<li>✅ <strong>Expert-Crafted Questions</strong>: Developed by experienced educators and healthcare professionals who understand what's tested</li>
<li>✅ <strong>Detailed Answer Explanations</strong>: Every question comes with a thorough rationale to deepen your understanding</li>
<li>✅ <strong>Affordable Price</strong>: Complete exam preparation at just $${price.toFixed(2)}</li>
<li>✅ <strong>30-Day Money-Back Guarantee</strong>: If you're not satisfied, we'll refund your purchase — no questions asked</li>
</ul>

<h2>How to Get Started</h2>
<ol>
<li><strong>Purchase</strong> the ${productTitle} test bank through our secure checkout</li>
<li><strong>Download</strong> instantly to your computer, tablet, or smartphone</li>
<li><strong>Study</strong> systematically using the chapter-by-chapter question sets</li>
<li><strong>Track</strong> your progress and identify areas for improvement</li>
<li><strong>Succeed</strong> in your upcoming examination</li>
</ol>

<h2>Frequently Asked Questions</h2>

<h3>How many questions are included?</h3>
<p>The ${productTitle} test bank includes hundreds of exam-style questions organized by chapter and topic, covering all major areas of the curriculum.</p>

<h3>What question formats are included?</h3>
<p>Questions include multiple choice, true/false, select-all-that-apply, and short answer formats — matching the style of real nursing examinations.</p>

<h3>Can I use this on multiple devices?</h3>
<p>Yes! Once purchased, you can download and access your test bank on any device — computer, tablet, or smartphone.</p>

<h3>Is there a money-back guarantee?</h3>
<p>Absolutely. We offer a 30-day money-back guarantee. If you're not completely satisfied, contact our support team for a full refund.</p>

<h3>How quickly will I receive my purchase?</h3>
<p>Instantly! After completing your purchase, you'll receive an immediate download link and a confirmation email with your access information.</p>

<h2>Start Studying Today</h2>
<p>Success in your ${productTitle} examination comes down to preparation, practice, and using the right study tools. Our comprehensive test bank gives you everything you need to master the material and walk into your exam with confidence.</p>
<p><a href="/products/${product.slug}" class="cta-link">Get the ${productTitle} test bank now for just $${price.toFixed(2)} →</a></p>
  `.trim();

  const metaTitle = `${productTitle} Study Guide & Test Bank | Testbankbooks`;
  const metaDescription = `Master your ${productTitle} exam with our comprehensive test bank. Hundreds of practice questions with detailed explanations, instant download. $${price.toFixed(2)} — 30-day guarantee.`;

  return {
    slug,
    title: blogTitle,
    excerpt,
    content,
    metaTitle,
    metaDescription,
    category,
  };
}
