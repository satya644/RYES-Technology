/**
 * RYES Technology - Public Website Application
 * Plain Vanilla ES Module
 */

import { getSettings, getPricing, getPortfolio, getTestimonials, submitLead, submitReview } from "./api.js";
import { I18N } from "./i18n.js";

// DOM Query Helpers
const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);

// State
let currentLang = localStorage.getItem("ryes_lang") || "hi";
let siteSettings = null;
let pricingCache = [];
let portfolioCache = [];
let testimonialsCache = [];
let activePricingFilter = "all";
let activePortfolioCategory = "all";

/**
 * YouTube Video ID Extractor
 */
function extractYouTubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : null;
}

/**
 * Format Indian Currency
 */
function formatINR(number) {
  return "₹" + Number(number || 0).toLocaleString("en-IN");
}

/**
 * Internationalization (i18n) Engine
 */
function applyLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("ryes_lang", lang);

  const t = I18N[lang] || I18N.hi;

  // Update language switch label
  const langSwitchText = $("#langSwitchText");
  if (langSwitchText) {
    langSwitchText.textContent = lang === "hi" ? "EN / English" : "HI / Hinglish";
  }

  // Update all data-i18n text nodes safely
  $$("[data-i18n]").forEach(element => {
    const key = element.getAttribute("data-i18n");
    if (t[key] !== undefined) {
      element.textContent = t[key];
    }
  });

  // Re-render dynamic sections with updated language
  if (siteSettings) renderHeroAndSettings(siteSettings);
  if (pricingCache.length) renderPricingCards(pricingCache, activePricingFilter);
  if (portfolioCache.length) renderPortfolioCards(portfolioCache, activePortfolioCategory);
  if (testimonialsCache.length) renderTestimonialCards(testimonialsCache);
}

/**
 * Setup Settings, Hero & Global WhatsApp CTAs
 */
function renderHeroAndSettings(settings) {
  const isHi = currentLang === "hi";

  // Hero Headline & Subheadline with language preference & fallbacks
  const heroTitle = isHi
    ? (settings.heroTitle_hi || settings.heroTitle_en || I18N.hi.heroTitleFallback)
    : (settings.heroTitle_en || settings.heroTitle_hi || I18N.en.heroTitleFallback);

  const heroSub = isHi
    ? (settings.heroSub_hi || settings.heroSub_en || I18N.hi.heroSubFallback)
    : (settings.heroSub_en || settings.heroSub_hi || I18N.en.heroSubFallback);

  const heroTitleEl = $("#heroTitle");
  const heroSubEl = $("#heroSub");
  if (heroTitleEl) heroTitleEl.textContent = heroTitle;
  if (heroSubEl) heroSubEl.textContent = heroSub;

  // WhatsApp Number & Dynamic Links
  const rawPhone = String(settings.whatsapp || "919876543210").replace(/\D/g, "");
  const formattedPhone = rawPhone.length === 10 ? "91" + rawPhone : rawPhone;
  const defaultWaText = encodeURIComponent(
    isHi
      ? "Namaste Satyam / RYES team, mujhe apne business/coaching growth ke baare me discuss karna hai."
      : "Hi Satyam / RYES team, I would like to discuss a growth plan for my business/coaching."
  );
  const waUrl = `https://wa.me/${formattedPhone}?text=${defaultWaText}`;

  // Update all dynamic WhatsApp CTA links
  $$(".wa-dynamic-link").forEach(link => {
    link.href = waUrl;
  });

  const footerWhatsappText = $("#footerWhatsappText");
  if (footerWhatsappText) {
    footerWhatsappText.textContent = "+" + formattedPhone;
  }

  // Email
  if (settings.email) {
    const emailLink = $("#directEmailLink");
    const emailText = $("#footerEmailText");
    if (emailLink) emailLink.href = "mailto:" + settings.email;
    if (emailText) emailText.textContent = settings.email;
  }

  // Social Links in Footer
  if (settings.instagram) {
    const instaLink = $("#footerInstagramLink");
    if (instaLink) {
      instaLink.href = settings.instagram;
      instaLink.hidden = false;
    }
  }

  if (settings.youtube) {
    const ytLink = $("#footerYoutubeLink");
    if (ytLink) {
      ytLink.href = settings.youtube;
      ytLink.hidden = false;
    }
  }
}

/**
 * Fetch Settings
 */
async function loadSettings() {
  try {
    siteSettings = await getSettings();
    renderHeroAndSettings(siteSettings);
  } catch (err) {
    console.warn("Could not load API settings, using local fallbacks:", err);
    siteSettings = {
      whatsapp: "919876543210",
      email: "contact@ryestechnology.in",
      heroTitle_hi: I18N.hi.heroTitleFallback,
      heroTitle_en: I18N.en.heroTitleFallback,
      heroSub_hi: I18N.hi.heroSubFallback,
      heroSub_en: I18N.en.heroSubFallback
    };
    renderHeroAndSettings(siteSettings);
  }
}

/**
 * Render Pricing Cards (XSS Safe - No innerHTML for data)
 */
function renderPricingCards(items, filterCategory) {
  const container = $("#pricingGrid");
  if (!container) return;

  const isHi = currentLang === "hi";
  const t = I18N[currentLang] || I18N.hi;

  // Filter by category
  const filtered = items.filter(item => {
    if (filterCategory === "all") return true;
    return item.vertical === filterCategory;
  });

  // Clear existing content
  container.textContent = "";

  if (!filtered.length) {
    const emptyNotice = document.createElement("div");
    emptyNotice.className = "empty-state-notice";
    emptyNotice.textContent = t.pricingError;
    container.appendChild(emptyNotice);
    return;
  }

  const rawPhone = String(siteSettings?.whatsapp || "919876543210").replace(/\D/g, "");
  const waPhone = rawPhone.length === 10 ? "91" + rawPhone : rawPhone;

  // Sort by order
  filtered.sort((a, b) => (a.order || 0) - (b.order || 0));

  filtered.forEach(plan => {
    const card = document.createElement("div");
    card.className = "price-card" + (plan.popular ? " popular-card" : "");

    // Popular Badge
    if (plan.popular) {
      const badge = document.createElement("div");
      badge.className = "badge-popular";
      badge.textContent = t.popularBadge;
      card.appendChild(badge);
    }

    // Plan Title
    const planName = isHi
      ? (plan.name_hi || plan.name_en || "Growth Package")
      : (plan.name_en || plan.name_hi || "Growth Package");

    const titleEl = document.createElement("h3");
    titleEl.textContent = planName;
    card.appendChild(titleEl);

    // Price Box
    const priceBox = document.createElement("div");
    priceBox.className = "price-box";

    if (plan.priceFrom) {
      const prefixEl = document.createElement("span");
      prefixEl.className = "price-prefix";
      prefixEl.textContent = t.priceStartingFrom;
      priceBox.appendChild(prefixEl);
    }

    const amountEl = document.createElement("span");
    amountEl.className = "price-amount";
    amountEl.textContent = formatINR(plan.price);
    priceBox.appendChild(amountEl);

    const periodEl = document.createElement("span");
    periodEl.className = "price-period";
    periodEl.textContent = plan.period === "month" ? t.pricePerMonth : t.priceOneTime;
    priceBox.appendChild(periodEl);

    card.appendChild(priceBox);

    // Features List
    const featuresList = document.createElement("ul");
    featuresList.className = "price-features";

    const features = isHi
      ? (plan.features_hi?.length ? plan.features_hi : plan.features_en)
      : (plan.features_en?.length ? plan.features_en : plan.features_hi);

    if (Array.isArray(features)) {
      features.forEach(featureText => {
        const li = document.createElement("li");
        li.textContent = featureText;
        featuresList.appendChild(li);
      });
    }
    card.appendChild(featuresList);

    // WhatsApp CTA button with prefilled plan message
    const ctaBtn = document.createElement("a");
    ctaBtn.className = "btn " + (plan.popular ? "btn-orange" : "btn-outline");
    ctaBtn.target = "_blank";
    ctaBtn.rel = "noopener";

    const prefilledText = encodeURIComponent(
      isHi
        ? `Namaste Satyam / RYES team, main "${planName}" plan (${formatINR(plan.price)}) book karne me interested hoon. Details share karein.`
        : `Hi Satyam / RYES team, I am interested in booking the "${planName}" plan (${formatINR(plan.price)}). Please share details.`
    );
    ctaBtn.href = `https://wa.me/${waPhone}?text=${prefilledText}`;
    ctaBtn.textContent = t.planWhatsappCta;

    card.appendChild(ctaBtn);
    container.appendChild(card);
  });
}

/**
 * Fetch Pricing
 */
async function loadPricing() {
  try {
    pricingCache = await getPricing();
    renderPricingCards(pricingCache, activePricingFilter);
  } catch (err) {
    console.error("Pricing load failed:", err);
    const container = $("#pricingGrid");
    if (container) {
      container.textContent = "";
      const errorMsg = document.createElement("div");
      errorMsg.className = "empty-state-notice";
      errorMsg.textContent = I18N[currentLang]?.pricingError || "Unable to load pricing.";
      container.appendChild(errorMsg);
    }
  }
}

/**
 * Render Portfolio Cards (XSS Safe)
 */
function renderPortfolioCards(items, selectedCategory) {
  const container = $("#portfolioGrid");
  if (!container) return;

  const isHi = currentLang === "hi";
  const t = I18N[currentLang] || I18N.hi;

  // Filter items
  const filtered = items.filter(item => {
    if (selectedCategory === "all") return true;
    return (item.category || "").toLowerCase() === selectedCategory.toLowerCase();
  });

  container.textContent = "";

  if (!filtered.length) {
    const emptyNotice = document.createElement("div");
    emptyNotice.className = "empty-state-notice";
    emptyNotice.textContent = t.portEmpty;
    container.appendChild(emptyNotice);
    return;
  }

  // Sort by order
  filtered.sort((a, b) => (a.order || 0) - (b.order || 0));

  filtered.forEach(item => {
    const card = document.createElement("div");
    card.className = "portfolio-item-card";

    const mediaUrl = item.mediaUrl || "";
    const ytId = extractYouTubeId(mediaUrl);
    const isVideoFile = mediaUrl.startsWith("/uploads/") || /\.(mp4|webm|mov|mkv|m4v)$/i.test(mediaUrl);

    // Resolve full video URL if relative (works on localhost, LAN IP, and production cloud)
    const fullMediaUrl = mediaUrl.startsWith("http")
      ? mediaUrl
      : (window.location.hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(window.location.hostname)
          ? `${window.location.protocol}//${window.location.hostname}:5000${mediaUrl}`
          : `${window.location.origin}${mediaUrl}`);

    const itemTitle = isHi
      ? (item.title_hi || item.title_en || "Project Preview")
      : (item.title_en || item.title_hi || "Project Preview");

    // Media Box
    const mediaBox = document.createElement("div");
    mediaBox.className = "port-media-box";

    // Category Tag
    const categoryBadge = document.createElement("span");
    categoryBadge.className = "port-category-badge";
    categoryBadge.textContent = item.category || "Project";
    mediaBox.appendChild(categoryBadge);

    // 1. Direct Uploaded / Native Video File (HTML5 Video Player directly on website)
    if (isVideoFile) {
      const videoEl = document.createElement("video");
      videoEl.controls = true;
      videoEl.playsInline = true;
      videoEl.preload = "metadata";
      if (item.thumbUrl) videoEl.poster = item.thumbUrl;
      videoEl.src = fullMediaUrl;
      mediaBox.appendChild(videoEl);
    }
    // 2. YouTube Video (Thumbnail with Lightbox Modal)
    else if (ytId) {
      const thumbImg = document.createElement("img");
      thumbImg.loading = "lazy";
      thumbImg.alt = itemTitle;
      thumbImg.src = item.thumbUrl || `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
      mediaBox.appendChild(thumbImg);

      const playOverlay = document.createElement("div");
      playOverlay.className = "port-play-overlay";
      const playCircle = document.createElement("div");
      playCircle.className = "port-play-circle";
      playCircle.textContent = "▶";
      playOverlay.appendChild(playCircle);
      mediaBox.appendChild(playOverlay);
      mediaBox.style.cursor = "pointer";
      mediaBox.addEventListener("click", () => openVideoLightbox(ytId));
    }
    // 3. Other External Media / Website Link
    else {
      const thumbImg = document.createElement("img");
      thumbImg.loading = "lazy";
      thumbImg.alt = itemTitle;
      thumbImg.src = item.thumbUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=640&q=80";
      mediaBox.appendChild(thumbImg);

      if (mediaUrl) {
        mediaBox.style.cursor = "pointer";
        mediaBox.addEventListener("click", () => window.open(mediaUrl, "_blank", "noopener"));
      }
    }

    card.appendChild(mediaBox);

    // Content Body
    const contentBox = document.createElement("div");
    contentBox.className = "port-content";

    const titleEl = document.createElement("h4");
    titleEl.textContent = itemTitle;
    contentBox.appendChild(titleEl);

    // Action button
    const actionBtn = document.createElement("button");
    actionBtn.type = "button";
    actionBtn.className = "btn btn-outline";
    actionBtn.style.fontSize = "13px";
    actionBtn.style.padding = "7px 14px";

    if (isVideoFile) {
      actionBtn.textContent = isHi ? "⛶ Fullscreen Me Play Karein" : "⛶ Play Fullscreen";
      actionBtn.addEventListener("click", () => {
        const v = mediaBox.querySelector("video");
        if (v) {
          if (v.requestFullscreen) v.requestFullscreen();
          else if (v.webkitRequestFullscreen) v.webkitRequestFullscreen();
          v.play();
        }
      });
    } else if (ytId) {
      actionBtn.textContent = t.portWatchBtn;
      actionBtn.addEventListener("click", () => openVideoLightbox(ytId));
    } else if (mediaUrl) {
      actionBtn.textContent = t.portViewBtn;
      actionBtn.addEventListener("click", () => window.open(mediaUrl, "_blank", "noopener"));
    } else {
      actionBtn.style.display = "none";
    }

    contentBox.appendChild(actionBtn);
    card.appendChild(contentBox);
    container.appendChild(card);
  });
}

/**
 * Setup Portfolio Dynamic Category Tabs
 */
function setupPortfolioTabs(items) {
  const tabsContainer = $("#portfolioTabs");
  if (!tabsContainer) return;

  const categories = new Set();
  items.forEach(item => {
    if (item.category) categories.add(item.category.trim());
  });

  // Re-build tabs safely
  tabsContainer.textContent = "";

  const allTab = document.createElement("button");
  allTab.type = "button";
  allTab.className = "port-tab active";
  allTab.textContent = I18N[currentLang]?.portAll || "All Work";
  allTab.addEventListener("click", () => {
    $$(".port-tab").forEach(b => b.classList.remove("active"));
    allTab.classList.add("active");
    activePortfolioCategory = "all";
    renderPortfolioCards(portfolioCache, "all");
  });
  tabsContainer.appendChild(allTab);

  categories.forEach(cat => {
    const tabBtn = document.createElement("button");
    tabBtn.type = "button";
    tabBtn.className = "port-tab";
    tabBtn.textContent = cat;
    tabBtn.addEventListener("click", () => {
      $$(".port-tab").forEach(b => b.classList.remove("active"));
      tabBtn.classList.add("active");
      activePortfolioCategory = cat;
      renderPortfolioCards(portfolioCache, cat);
    });
    tabsContainer.appendChild(tabBtn);
  });
}

/**
 * Fetch Portfolio
 */
async function loadPortfolio() {
  try {
    portfolioCache = await getPortfolio();
    setupPortfolioTabs(portfolioCache);
    renderPortfolioCards(portfolioCache, activePortfolioCategory);
  } catch (err) {
    console.error("Portfolio load failed:", err);
    const container = $("#portfolioGrid");
    if (container) {
      container.textContent = "";
      const errorMsg = document.createElement("div");
      errorMsg.className = "empty-state-notice";
      errorMsg.textContent = I18N[currentLang]?.portEmpty || "Portfolio updating.";
      container.appendChild(errorMsg);
    }
  }
}

/**
 * Render Testimonials (Hidden if empty)
 */
function renderTestimonialCards(items) {
  const section = $("#testimonials");
  const container = $("#testimonialsGrid");
  if (!section || !container) return;

  section.style.display = "block";
  container.textContent = "";

  if (!items || !items.length) {
    const emptyNotice = document.createElement("div");
    emptyNotice.className = "empty-state-notice";
    emptyNotice.textContent = currentLang === "hi"
      ? "Abhi koi review published nahi hai. Upar diye button se sabse pehla review aap share karein!"
      : "No reviews published yet. Be the first to share your feedback using the button above!";
    container.appendChild(emptyNotice);
    return;
  }

  const isHi = currentLang === "hi";

  items.sort((a, b) => (a.order || 0) - (b.order || 0));

  items.forEach(t => {
    const card = document.createElement("div");
    card.className = "testimonial-card";

    // Rating Stars
    const starsEl = document.createElement("div");
    starsEl.className = "test-stars";
    starsEl.textContent = "★".repeat(t.rating || 5);
    card.appendChild(starsEl);

    // Quote
    const quoteEl = document.createElement("p");
    quoteEl.className = "test-quote";
    const quoteText = isHi
      ? (t.text_hi || t.text_en || "")
      : (t.text_en || t.text_hi || "");
    quoteEl.textContent = `“${quoteText}”`;
    card.appendChild(quoteEl);

    // Client Info
    const authorBox = document.createElement("div");
    authorBox.className = "test-client-info";

    const avatar = document.createElement("div");
    avatar.className = "test-avatar-placeholder";
    avatar.textContent = (t.name || "C")[0].toUpperCase();
    authorBox.appendChild(avatar);

    const meta = document.createElement("div");
    const nameEl = document.createElement("b");
    nameEl.textContent = t.name || "Satisfied Client";
    meta.appendChild(nameEl);

    const roleEl = document.createElement("span");
    roleEl.textContent = t.role || "Business Owner";
    meta.appendChild(roleEl);

    authorBox.appendChild(meta);
    card.appendChild(authorBox);
    container.appendChild(card);
  });
}

/**
 * Fetch Testimonials
 */
async function loadTestimonials() {
  try {
    testimonialsCache = await getTestimonials();
    renderTestimonialCards(testimonialsCache);
  } catch (err) {
    console.warn("Testimonials load failed, hiding section:", err);
    const section = $("#testimonials");
    if (section) section.style.display = "none";
  }
}

/**
 * Lightbox Modal Controller (YouTube No-Cookie)
 */
function setupLightbox() {
  const modal = $("#videoLightbox");
  const iframe = $("#lightboxIframe");
  const closeBtn = $("#closeLightboxBtn");

  window.openVideoLightbox = function(youtubeId) {
    if (!modal || !iframe || !youtubeId) return;
    iframe.src = `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0`;
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  };

  function closeLightbox() {
    if (!modal || !iframe) return;
    iframe.src = "";
    modal.classList.remove("active");
    document.body.style.overflow = "";
  }

  if (closeBtn) closeBtn.addEventListener("click", closeLightbox);

  if (modal) {
    modal.addEventListener("click", e => {
      if (e.target === modal) closeLightbox();
    });
  }

  window.addEventListener("keydown", e => {
    if (e.key === "Escape" && modal?.classList.contains("active")) {
      closeLightbox();
    }
  });
}

/**
 * FAQ Accordion Setup
 */
function setupFaqAccordion() {
  const faqItems = $$(".faq-item");
  faqItems.forEach(item => {
    const btn = item.querySelector(".faq-question-btn");
    const answer = item.querySelector(".faq-answer");
    if (!btn || !answer) return;

    btn.addEventListener("click", () => {
      const isOpen = item.classList.contains("open");

      // Close all others
      faqItems.forEach(otherItem => {
        otherItem.classList.remove("open");
        const otherAnswer = otherItem.querySelector(".faq-answer");
        if (otherAnswer) otherAnswer.style.maxHeight = null;
      });

      // Toggle current
      if (!isOpen) {
        item.classList.add("open");
        answer.style.maxHeight = answer.scrollHeight + 30 + "px";
      }
    });
  });
}

/**
 * Free Audit / Lead Capture Form Handler
 */
function setupLeadForm() {
  const form = $("#leadForm");
  const submitBtn = $("#submitLeadBtn");
  const errorAlert = $("#formErrorAlert");
  const successBox = $("#formSuccessBox");

  if (!form) return;

  form.addEventListener("submit", async e => {
    e.preventDefault();

    if (errorAlert) {
      errorAlert.style.display = "none";
      errorAlert.textContent = "";
    }

    const t = I18N[currentLang] || I18N.hi;

    // Read form inputs
    const name = ($("#leadName")?.value || "").trim();
    const phone = ($("#leadPhone")?.value || "").trim();
    const businessType = ($("#leadBusiness")?.value || "").trim();
    const vertical = $("#leadVertical")?.value || "other";
    const message = ($("#leadMessage")?.value || "").trim();
    const website = ($("#websiteHoneypot")?.value || "").trim(); // Honeypot

    // Phone Validation: 10 to 15 digits
    const digitsOnly = phone.replace(/\D/g, "");
    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
      if (errorAlert) {
        errorAlert.textContent = t.phoneValidationErr;
        errorAlert.style.display = "block";
      }
      return;
    }

    // Anti-spam Honeypot Check: if filled by a bot, silently fake success
    if (website) {
      form.style.display = "none";
      if (successBox) successBox.classList.add("active");
      return;
    }

    // Disable button and indicate sending
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = t.formSending;
    }

    try {
      // Call ES-Module API helper with exact signature
      await submitLead({
        name,
        phone: digitsOnly,
        businessType,
        vertical,
        message,
        lang: currentLang,
        website
      });

      // Success State
      form.style.display = "none";
      if (successBox) {
        successBox.classList.add("active");

        // Dynamic prefilled WhatsApp button on success
        const successWaBtn = $("#successWaBtn");
        if (successWaBtn) {
          const rawWa = String(siteSettings?.whatsapp || "919876543210").replace(/\D/g, "");
          const waPhone = rawWa.length === 10 ? "91" + rawWa : rawWa;
          const text = encodeURIComponent(
            currentLang === "hi"
              ? `Namaste Satyam / RYES, maine abhi website par audit request submit ki hai (Name: ${name}, Business: ${businessType || "N/A"}). Aapse baat karni thi.`
              : `Hi Satyam / RYES, I just submitted an audit request on your website (Name: ${name}, Business: ${businessType || "N/A"}). Looking forward to connecting.`
          );
          successWaBtn.href = `https://wa.me/${waPhone}?text=${text}`;
        }
      }
    } catch (err) {
      if (errorAlert) {
        errorAlert.textContent = "❌ " + (err.message || "Request submission failed. Please WhatsApp us directly.");
        errorAlert.style.display = "block";
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = t.formSubmitBtn;
      }
    }
  });
}

/**
 * Setup Pricing Filter Tabs
 */
function setupPricingTabs() {
  $$(".pricing-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      $$(".pricing-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      activePricingFilter = tab.getAttribute("data-filter") || "all";
      renderPricingCards(pricingCache, activePricingFilter);
    });
  });
}

/**
 * Setup Language Toggle & Mobile Navigation
 */
function setupNavigation() {
  // Language Switch
  const langSwitch = $("#langSwitch");
  if (langSwitch) {
    langSwitch.addEventListener("click", () => {
      const nextLang = currentLang === "hi" ? "en" : "hi";
      applyLanguage(nextLang);
    });
  }

  // Mobile Menu Toggle
  const mobileToggle = $("#mobileNavToggle");
  const navMenu = $("#navMenu");
  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener("click", () => {
      navMenu.classList.toggle("active");
    });

    // Close menu when clicking any nav link
    $$(".nav-menu a").forEach(link => {
      link.addEventListener("click", () => {
        navMenu.classList.remove("active");
      });
    });
  }
}

/**
 * Setup Public Review / Rating Submission Modal
 */
function setupReviewModal() {
  const modal = $("#reviewModal");
  const openBtn = $("#openReviewModalBtn");
  const closeBtn = $("#closeReviewModalBtn");
  const form = $("#publicReviewForm");
  const starContainer = $("#starRatingSelect");
  const starInput = $("#selectedStarRating");
  const statusAlert = $("#reviewStatusAlert");
  const successBox = $("#reviewSuccessBox");
  const submitBtn = $("#submitReviewBtn");

  if (!modal) return;

  function openModal() {
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
    if (statusAlert) statusAlert.style.display = "none";
    if (successBox) successBox.style.display = "none";
    if (form) {
      form.style.display = "block";
      form.reset();
    }
    setStars(5);
  }

  function closeModal() {
    modal.classList.remove("active");
    document.body.style.overflow = "";
  }

  if (openBtn) openBtn.addEventListener("click", openModal);
  if (closeBtn) closeBtn.addEventListener("click", closeModal);

  modal.addEventListener("click", e => {
    if (e.target === modal) closeModal();
  });

  // Interactive Stars
  function setStars(val) {
    const num = Number(val) || 5;
    if (starInput) starInput.value = num;
    $$("#starRatingSelect .star-item").forEach(s => {
      const sVal = Number(s.getAttribute("data-val"));
      s.style.color = sVal <= num ? "#FBBF24" : "#4B5563";
      s.style.transform = sVal <= num ? "scale(1.15)" : "scale(1)";
    });
  }

  if (starContainer) {
    $$("#starRatingSelect .star-item").forEach(star => {
      star.addEventListener("click", () => {
        setStars(star.getAttribute("data-val"));
      });
      star.addEventListener("mouseenter", () => {
        const val = Number(star.getAttribute("data-val"));
        $$("#starRatingSelect .star-item").forEach(s => {
          s.style.color = Number(s.getAttribute("data-val")) <= val ? "#FBBF24" : "#4B5563";
        });
      });
    });

    starContainer.addEventListener("mouseleave", () => {
      setStars(starInput ? starInput.value : 5);
    });
  }

  // Form Submit
  if (form) {
    form.addEventListener("submit", async e => {
      e.preventDefault();

      if (statusAlert) statusAlert.style.display = "none";

      const name = ($("#revName")?.value || "").trim();
      const role = ($("#revRole")?.value || "").trim();
      const text = ($("#revText")?.value || "").trim();
      const rating = Number(starInput?.value || 5);
      const website = ($("#revHoneypot")?.value || "").trim();

      if (!name) {
        if (statusAlert) {
          statusAlert.textContent = "Kripya apna naam likhein.";
          statusAlert.style.display = "block";
        }
        return;
      }

      if (!text) {
        if (statusAlert) {
          statusAlert.textContent = "Kripya apna feedback / review text likhein.";
          statusAlert.style.display = "block";
        }
        return;
      }

      // Honeypot trap
      if (website) {
        form.style.display = "none";
        if (successBox) successBox.style.display = "block";
        return;
      }

      const t = I18N[currentLang] || I18N.hi;

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = t.revSubmitting || "Bheja ja raha hai...";
      }

      try {
        await submitReview({
          name,
          role,
          rating,
          text,
          lang: currentLang,
          website
        });

        form.style.display = "none";
        if (successBox) successBox.style.display = "block";

        setTimeout(() => {
          closeModal();
        }, 3500);
      } catch (err) {
        if (statusAlert) {
          statusAlert.textContent = "❌ " + (err.message || "Review submit nahi ho paya.");
          statusAlert.style.display = "block";
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = t.revSubmitBtn || "Review Submit Karein";
        }
      }
    });
  }
}

/**
 * App Initialization
 */
window.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  setupPricingTabs();
  setupLightbox();
  setupFaqAccordion();
  setupLeadForm();
  setupReviewModal();

  // Apply Initial Language (default: Hinglish "hi")
  applyLanguage(currentLang);

  // Load API Data
  loadSettings();
  loadPricing();
  loadPortfolio();
  loadTestimonials();
});
