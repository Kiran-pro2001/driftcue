/**
 * DriftCue — Official Landing Page Controller
 * Extension Serene Sage Palette
 * Handlers: FAQ Accordion, Video Slot Preview, 3D Card Tilt, Scroll Reveal, 3D Ambient Background
 */

document.addEventListener("DOMContentLoaded", () => {
  initFaqAccordion();
  initVideoPlayer();
  initVanishingTimer();
  initScrollReveal();
  init3DCardTilt();
  initAmbient3DBackground();
  initAnalyticsTracking();
});

/**
 * FAQ Accordion Toggles & Tracking
 */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll(".faq-item");

  faqItems.forEach((item) => {
    const questionBtn = item.querySelector(".faq-question");
    if (!questionBtn) return;

    questionBtn.addEventListener("click", () => {
      const isOpen = item.classList.contains("active");

      // Close all other open accordion items
      faqItems.forEach((other) => {
        if (other !== item) other.classList.remove("active");
      });

      // Toggle current item
      const willOpen = !isOpen;
      item.classList.toggle("active", willOpen);

      if (willOpen) {
        const questionText = questionBtn.querySelector("span")?.innerText.trim() || "FAQ";
        trackPosthogEvent("faq_question_expanded", { question: questionText });
      }
    });
  });
}

/**
 * Video Player & Telemetry Handler
 */
function initVideoPlayer() {
  const video = document.getElementById("hero-video-player");
  if (!video) return;

  const videoMilestones = { 25: false, 50: false, 75: false, 100: false };
  let hasStarted = false;

  video.addEventListener("play", () => {
    if (!hasStarted) {
      hasStarted = true;
      trackPosthogEvent("demo_video_started", {
        video_src: video.currentSrc || "assets/demo.mp4",
        duration: Math.round(video.duration || 114)
      });
    }
  });

  // Video progress telemetry
  video.addEventListener("timeupdate", () => {
    if (!video.duration) return;
    const percent = Math.round((video.currentTime / video.duration) * 100);

    [25, 50, 75, 100].forEach((mark) => {
      if (percent >= mark && !videoMilestones[mark]) {
        videoMilestones[mark] = true;
        trackPosthogEvent("demo_video_progress", {
          progress_percent: mark,
          seconds_watched: Math.round(video.currentTime)
        });
      }
    });
  });

  video.addEventListener("ended", () => {
    trackPosthogEvent("demo_video_completed", {
      total_duration: Math.round(video.duration)
    });
  });
}

/**
 * 45 Minutes Vanish — Animated Live Urgency Timer
 * Actively counts down seconds to visually demonstrate time slipping away down rabbit holes
 */
function initVanishingTimer() {
  const timerEl = document.getElementById("live-vanish-timer");
  if (!timerEl) return;

  let totalSeconds = 45 * 60; // 45 minutes countdown

  setInterval(() => {
    totalSeconds--;
    if (totalSeconds < 0) totalSeconds = 45 * 60;

    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    timerEl.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, 1000);
}

/**
 * Smooth In-Page Video Notice Modal
 */
function showVideoNoticeModal() {
  const existing = document.getElementById("video-notice-modal");
  if (existing) {
    existing.classList.add("modal-visible");
    return;
  }

  const modal = document.createElement("div");
  modal.id = "video-notice-modal";
  modal.className = "video-modal-backdrop modal-visible";
  modal.innerHTML = `
    <div class="video-modal-card">
      <button class="video-modal-close" aria-label="Close modal">&times;</button>
      <div class="video-modal-icon">🎬</div>
      <h3 class="video-modal-title">Live 30-Sec Demo Video</h3>
      <p class="video-modal-desc">
        The official launch demo video is featured on Kiran's Twitter/X and YouTube channel as part of <strong>Day 001 of 365 Days</strong>.
      </p>
      <div class="video-modal-actions">
        <a href="https://x.com/ErKiranKumar_" target="_blank" rel="noopener noreferrer" class="btn btn-primary video-modal-btn">
          Watch on Twitter / X 𝕏
        </a>
        <a href="https://wa.me/918590658979?text=Hey%20Kiran%2C%20I%20want%20to%20see%20the%20DriftCue%20demo%20video!" target="_blank" rel="noopener noreferrer" class="btn btn-secondary video-modal-btn">
          Message Kiran on WhatsApp
        </a>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector(".video-modal-close").addEventListener("click", () => {
    modal.classList.remove("modal-visible");
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.remove("modal-visible");
  });
}

/**
 * Scroll Reveal Animations (Smooth Staggered Rise)
 */
function initScrollReveal() {
  const revealTargets = document.querySelectorAll(
    ".section-header-wrap, .video-container-wrap, .reality-card-expanded, .founder-card-clean, .benefit-card, .comp-col, .pricing-card, .faq-item, .decision-card"
  );

  if (!("IntersectionObserver" in window)) {
    return; // Safe fallback: all cards remain normally visible
  }

  revealTargets.forEach((el) => {
    el.classList.add("reveal-init");
  });

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-revealed");
        obs.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: "0px 0px -40px 0px"
  });

  revealTargets.forEach((el) => observer.observe(el));
}

/**
 * 3D Interactive Card Tilt & Dynamic Cursor Spotlight
 * Linear/Apple style: tracks mouse on hover with subtle tilt and light reflection
 */
function init3DCardTilt() {
  // Only apply tilt on desktop with fine mouse pointer for top performance
  if (window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768) {
    return;
  }

  const cards = document.querySelectorAll(
    ".reality-card-expanded, .founder-card-clean, .benefit-card, .comp-col, .pricing-card, .decision-card, .video-container-wrap"
  );

  cards.forEach((card) => {
    card.classList.add("card-3d-interactive");

    let isHovered = false;
    let animId = null;
    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;

    function onMouseMove(e) {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Update cursor coordinate variables for radial spotlight shine
      card.style.setProperty("--mouse-x", `${x}px`);
      card.style.setProperty("--mouse-y", `${y}px`);

      // Calculate subtle perspective tilt: max 4.5 degrees
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      targetX = ((y - centerY) / centerY) * -4.5;
      targetY = ((x - centerX) / centerX) * 4.5;

      if (!isHovered) {
        isHovered = true;
        render();
      }
    }

    function render() {
      if (!isHovered) {
        // Smoothly ease back to flat resting position
        curX += (0 - curX) * 0.14;
        curY += (0 - curY) * 0.14;

        if (Math.abs(curX) < 0.05 && Math.abs(curY) < 0.05) {
          card.style.transform = "";
          cancelAnimationFrame(animId);
          animId = null;
          return;
        }
      } else {
        // Smooth lerp towards target tilt
        curX += (targetX - curX) * 0.14;
        curY += (targetY - curY) * 0.14;
      }

      // Apply subtle 3D tilt with elevation
      card.style.transform = `perspective(1000px) rotateX(${curX.toFixed(2)}deg) rotateY(${curY.toFixed(2)}deg) translateY(-8px)`;
      animId = requestAnimationFrame(render);
    }

    card.addEventListener("mouseenter", (e) => {
      isHovered = true;
      card.classList.add("is-hovered");
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
      card.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
      if (!animId) {
        animId = requestAnimationFrame(render);
      }
    });

    card.addEventListener("mousemove", onMouseMove);

    card.addEventListener("mouseleave", () => {
      isHovered = false;
      card.classList.remove("is-hovered");
    });
  });
}

/**
 * 3D Ambient Background Graphics Canvas
 * Renders a soothing, floating 3D field of mindful focus nodes & ambient aura waves
 * (Theme: Serene Sage & Warm Sand — calming, low CPU, 60fps)
 */
function initAmbient3DBackground() {
  const canvas = document.getElementById("ambient-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Respect user motion preferences
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  let width = 0;
  let height = 0;
  let dpr = 1;
  let animationFrameId = null;
  let isTabActive = true;

  // Mouse interaction coordinates
  let mouse = { x: -1000, y: -1000, active: false };

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);
  }

  window.addEventListener("resize", resize, { passive: true });
  resize();

  window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
  }, { passive: true });

  window.addEventListener("mouseleave", () => {
    mouse.active = false;
  });

  // Pause when switching tabs to save battery & CPU
  document.addEventListener("visibilitychange", () => {
    isTabActive = !document.hidden;
    if (isTabActive && !animationFrameId) {
      lastTime = performance.now();
      loop(lastTime);
    }
  });

  // Generate 3D nodes (depth z from 0 to 1)
  const NODE_COUNT = Math.min(Math.floor(width / 32), 48);
  const nodes = [];

  for (let i = 0; i < NODE_COUNT; i++) {
    nodes.push({
      x: Math.random() * width,
      y: Math.random() * height,
      z: Math.random() * 0.9 + 0.1, // 3D depth layer
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      radius: Math.random() * 2.2 + 1.2,
      baseRadius: Math.random() * 2.2 + 1.2,
      phase: Math.random() * Math.PI * 2,
      // 70% Serene Sage, 30% Warm Sand
      isSand: Math.random() > 0.72
    });
  }

  let lastTime = performance.now();

  function loop(now) {
    if (!isTabActive) {
      animationFrameId = null;
      return;
    }

    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    ctx.clearRect(0, 0, width, height);

    // Draw ambient background aura gradients (Serene Sage & Warm Sand)
    const timeSec = now * 0.0004;
    const aura1X = width * 0.25 + Math.cos(timeSec) * 90;
    const aura1Y = height * 0.3 + Math.sin(timeSec) * 60;
    const aura2X = width * 0.75 + Math.sin(timeSec * 0.8) * 110;
    const aura2Y = height * 0.65 + Math.cos(timeSec * 0.8) * 70;

    // Sage Aura
    const grad1 = ctx.createRadialGradient(aura1X, aura1Y, 10, aura1X, aura1Y, width * 0.42);
    grad1.addColorStop(0, "rgba(122, 154, 139, 0.09)");
    grad1.addColorStop(1, "rgba(122, 154, 139, 0)");
    ctx.fillStyle = grad1;
    ctx.fillRect(0, 0, width, height);

    // Warm Sand Aura
    const grad2 = ctx.createRadialGradient(aura2X, aura2Y, 10, aura2X, aura2Y, width * 0.38);
    grad2.addColorStop(0, "rgba(197, 165, 130, 0.06)");
    grad2.addColorStop(1, "rgba(197, 165, 130, 0)");
    ctx.fillStyle = grad2;
    ctx.fillRect(0, 0, width, height);

    // Update & draw nodes
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];

      // Perspective projection
      const scale = 1 / (1 + (1 - n.z) * 0.7);

      // Sinusoidal natural floating motion
      n.phase += dt * 0.8;
      n.x += (n.vx + Math.sin(n.phase) * 0.15) * scale;
      n.y += (n.vy + Math.cos(n.phase) * 0.15) * scale;

      // Mouse gentle dispersion & mindful return
      if (mouse.active) {
        const dx = n.x - mouse.x;
        const dy = n.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 140;
        if (dist < maxDist && dist > 0) {
          const force = (1 - dist / maxDist) * 1.5;
          n.x += (dx / dist) * force;
          n.y += (dy / dist) * force;
        }
      }

      // Wrap edges smoothly
      if (n.x < -30) n.x = width + 30;
      if (n.x > width + 30) n.x = -30;
      if (n.y < -30) n.y = height + 30;
      if (n.y > height + 30) n.y = -30;

      // Node size & opacity based on 3D depth
      const r = n.baseRadius * scale;
      const alpha = (0.35 + n.z * 0.45);

      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);

      if (n.isSand) {
        ctx.fillStyle = `rgba(197, 165, 130, ${alpha.toFixed(2)})`;
      } else {
        ctx.fillStyle = `rgba(122, 154, 139, ${alpha.toFixed(2)})`;
      }
      ctx.fill();

      // Connect nearby nodes with delicate filament lines
      for (let j = i + 1; j < nodes.length; j++) {
        const n2 = nodes[j];
        const lineDx = n.x - n2.x;
        const lineDy = n.y - n2.y;
        const lineDist = Math.sqrt(lineDx * lineDx + lineDy * lineDy);
        const maxLineDist = 120 * scale;

        if (lineDist < maxLineDist) {
          const lineAlpha = (1 - lineDist / maxLineDist) * 0.16 * scale;
          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(n2.x, n2.y);
          ctx.strokeStyle = `rgba(122, 154, 139, ${lineAlpha.toFixed(3)})`;
          ctx.lineWidth = 0.8 * scale;
          ctx.stroke();
        }
      }
    }

    animationFrameId = requestAnimationFrame(loop);
  }

  animationFrameId = requestAnimationFrame(loop);
}

/**
 * Universal PostHog Event Dispatcher
 */
function trackPosthogEvent(eventName, properties = {}) {
  try {
    if (window.posthog && typeof window.posthog.capture === "function") {
      window.posthog.capture(eventName, {
        page_title: document.title,
        page_path: window.location.pathname,
        referrer: document.referrer || "direct",
        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight,
        timestamp: new Date().toISOString(),
        ...properties
      });
    }
  } catch (err) {
    // Graceful no-op to ensure zero site disruption
  }
}

/**
 * Analytics Tracking: Dwell Time, Scroll Depth, CTAs, and WhatsApp Leads
 */
function initAnalyticsTracking() {
  const startTime = Date.now();

  // 1. Time-Spent Milestones (15s, 30s, 60s, 120s, 300s)
  const milestones = [
    { seconds: 15, label: "15_seconds" },
    { seconds: 30, label: "30_seconds" },
    { seconds: 60, label: "1_minute" },
    { seconds: 120, label: "2_minutes" },
    { seconds: 300, label: "5_minutes" }
  ];

  milestones.forEach(({ seconds, label }) => {
    setTimeout(() => {
      trackPosthogEvent("time_spent_milestone", {
        milestone: label,
        seconds_elapsed: seconds
      });
    }, seconds * 1000);
  });

  // Track total session dwell time on page unload
  window.addEventListener("pagehide", () => {
    const totalSeconds = Math.round((Date.now() - startTime) / 1000);
    trackPosthogEvent("session_dwell_time", {
      total_seconds: totalSeconds
    });
  });

  // 2. CTA & WhatsApp Click Tracking
  document.addEventListener("click", (e) => {
    const targetLink = e.target.closest("a");
    if (!targetLink) return;

    const href = targetLink.getAttribute("href") || "";
    const text = targetLink.innerText.trim();
    const section = targetLink.closest("section")?.id || targetLink.closest("header")?.id || "other";

    // Detect WhatsApp Leads
    if (href.includes("wa.me") || href.includes("whatsapp.com")) {
      trackPosthogEvent("whatsapp_lead_initiated", {
        button_text: text,
        source_section: section,
        destination_url: href
      });
    } 
    // Detect general navigation or internal anchor CTAs
    else if (targetLink.classList.contains("btn")) {
      trackPosthogEvent("cta_button_clicked", {
        button_text: text,
        source_section: section,
        destination_url: href
      });
    }
    // Detect Outbound Social Links
    else if (targetLink.classList.contains("social-pill") || targetLink.classList.contains("comm-link")) {
      trackPosthogEvent("social_link_clicked", {
        platform: text,
        destination_url: href
      });
    }
  });

  // 3. Scroll Depth Milestones (25%, 50%, 75%, 100%)
  const scrollMilestones = { 25: false, 50: false, 75: false, 100: false };
  let scrollThrottle = null;

  window.addEventListener("scroll", () => {
    if (scrollThrottle) return;
    scrollThrottle = setTimeout(() => {
      scrollThrottle = null;

      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;

      const scrollPercent = Math.min(100, Math.round((window.scrollY / docHeight) * 100));

      [25, 50, 75, 100].forEach((mark) => {
        if (scrollPercent >= mark && !scrollMilestones[mark]) {
          scrollMilestones[mark] = true;
          trackPosthogEvent("scroll_depth_reached", {
            depth_percent: mark
          });
        }
      });
    }, 250);
  }, { passive: true });
}
