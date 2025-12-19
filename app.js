class AppState {
  constructor() {
    this.currentSection = "hero";
    this.scrollProgress = 0;
    this.isLoading = true;
    this.audioInstances = new Map();
    this.currentAudio = null;
    this.sceneState = "wireframe";
    this.sections = [
      "hero",
      "tutorial",
      "hall",
      "origin",
      "library",
      "sprite",
      "garden",
      "quiz",
      "find",
    ];
  }

  updateSection(section) {
    this.currentSection = section;
    this.updateBackground();
    this.updateNavDots();
  }

  updateBackground() {
    const states = ["wireframe", "garden", "final"];
    const bgLayers = document.querySelectorAll(".bg-layer");

    bgLayers.forEach((layer) => layer.classList.remove("active"));

    const sectionIndex = this.sections.indexOf(this.currentSection);
    let stateIndex = 0;

    if (sectionIndex >= 5) stateIndex = 2;
    else if (sectionIndex >= 2) stateIndex = 1;

    document
      .querySelector(`.bg-layer.${states[stateIndex]}`)
      .classList.add("active");
    this.sceneState = states[stateIndex];
  }

  updateNavDots() {
    document.querySelectorAll(".nav-dot").forEach((dot, index) => {
      if (this.sections[index] === this.currentSection) {
        dot.classList.add("active");
      } else {
        dot.classList.remove("active");
      }
    });
  }
}

// ====================
// SCENE MANAGER
// ====================
class SceneManager {
  constructor() {
    this.canvas = document.getElementById("scene-canvas");
    this.ctx = this.canvas.getContext("2d");
    this.particles = [];
    this.frame = 0;
    this.sceneType = "wireframe";
    this.init();
  }

  init() {
    this.resize();
    window.addEventListener("resize", () => this.resize());
    this.createParticles();
    this.animate();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.createParticles();
  }

  createParticles() {
    this.particles = [];
    const particleCount = Math.min(
      100,
      (window.innerWidth * window.innerHeight) / 10000
    );
    const types = {
      wireframe: { color: "#00ff88", count: particleCount, speed: 0.5 },
      garden: { color: "#ffff00", count: particleCount * 1.5, speed: 0.8 },
      final: { color: "#8800ff", count: particleCount * 2, speed: 1.2 },
    };

    const config = types[this.sceneType] || types.wireframe;

    for (let i = 0; i < config.count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 2 + 1,
        speedX: (Math.random() - 0.5) * config.speed,
        speedY: (Math.random() - 0.5) * config.speed,
        color: config.color,
        opacity: Math.random() * 0.5 + 0.3,
      });
    }
  }

  setScene(type) {
    this.sceneType = type;
    this.createParticles();
  }

  animate() {
    this.frame++;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Update and draw particles
    this.particles.forEach((particle) => {
      particle.x +=
        particle.speedX + Math.sin(this.frame * 0.01 + particle.y * 0.01) * 0.1;
      particle.y +=
        particle.speedY + Math.cos(this.frame * 0.01 + particle.x * 0.01) * 0.1;

      // Wrap around
      if (particle.x > this.canvas.width) particle.x = 0;
      if (particle.x < 0) particle.x = this.canvas.width;
      if (particle.y > this.canvas.height) particle.y = 0;
      if (particle.y < 0) particle.y = this.canvas.height;

      // Draw particle
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(${this.hexToRgb(particle.color)}, ${
        particle.opacity
      })`;
      this.ctx.fill();

      // Draw connections
      this.particles.forEach((other) => {
        const dx = particle.x - other.x;
        const dy = particle.y - other.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 150 && Math.random() > 0.7) {
          this.ctx.beginPath();
          this.ctx.moveTo(particle.x, particle.y);
          this.ctx.lineTo(other.x, other.y);
          this.ctx.strokeStyle = `rgba(${this.hexToRgb(particle.color)}, ${
            0.1 * (1 - distance / 150)
          })`;
          this.ctx.lineWidth = 0.5;
          this.ctx.stroke();
        }
      });
    });

    requestAnimationFrame(() => this.animate());
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(
          result[3],
          16
        )}`
      : "0, 255, 136";
  }
}

// ====================
// AUDIO MANAGER
// ====================
class AudioManager {
  constructor() {
    this.audios = new Map();
    this.currentAudio = null;
    this.init();
  }

  init() {
    document.querySelectorAll("audio").forEach((audio) => {
      const id = audio.id;
      this.audios.set(id, {
        element: audio,
        isPlaying: false,
        progressBar: document.getElementById(`progress${id.slice(-1)}`),
        currentTime: document.getElementById(`current${id.slice(-1)}`),
        duration: document.getElementById(`duration${id.slice(-1)}`),
      });

      audio.addEventListener("loadedmetadata", () => {
        const data = this.audios.get(id);
        if (data.duration) {
          data.duration.textContent = this.formatTime(audio.duration);
        }
      });

      audio.addEventListener("timeupdate", () => {
        const data = this.audios.get(id);
        if (data.progressBar) {
          const progress = (audio.currentTime / audio.duration) * 100;
          data.progressBar.style.width = `${progress}%`;
        }
        if (data.currentTime) {
          data.currentTime.textContent = this.formatTime(audio.currentTime);
        }
      });

      audio.addEventListener("ended", () => {
        const btn = document.querySelector(`.play-btn[data-audio="${id}"]`);
        if (btn) {
          btn.innerHTML = '<i class="fas fa-play"></i>';
        }
        this.audios.get(id).isPlaying = false;
        this.currentAudio = null;
      });
    });

    // Play button event listeners
    document.querySelectorAll(".play-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const audioId = e.currentTarget.getAttribute("data-audio");
        this.toggleAudio(audioId);
      });
    });

    // Progress bar click to seek
    document.querySelectorAll(".progress-container").forEach((container) => {
      container.addEventListener("click", (e) => {
        const rect = container.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        const audioId = container
          .closest(".audio-card")
          .querySelector(".play-btn")
          .getAttribute("data-audio");
        const audio = this.audios.get(audioId).element;

        if (audio.duration) {
          const seekTime = (clickX / width) * audio.duration;
          audio.currentTime = seekTime;
        }
      });
    });
  }

  toggleAudio(audioId) {
    const data = this.audios.get(audioId);
    if (!data) return;

    const audio = data.element;
    const btn = document.querySelector(`.play-btn[data-audio="${audioId}"]`);

    // Pause current audio if different
    if (this.currentAudio && this.currentAudio !== audioId) {
      const currentData = this.audios.get(this.currentAudio);
      currentData.element.pause();
      currentData.isPlaying = false;
      const currentBtn = document.querySelector(
        `.play-btn[data-audio="${this.currentAudio}"]`
      );
      if (currentBtn) {
        currentBtn.innerHTML = '<i class="fas fa-play"></i>';
      }
    }

    if (audio.paused) {
      audio.play();
      data.isPlaying = true;
      if (btn) btn.innerHTML = '<i class="fas fa-pause"></i>';
      this.currentAudio = audioId;
    } else {
      audio.pause();
      data.isPlaying = false;
      if (btn) btn.innerHTML = '<i class="fas fa-play"></i>';
      this.currentAudio = null;
    }
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }
}

// ====================
// ANIMATION MANAGER
// ====================
class AnimationManager {
  constructor() {
    this.timelines = new Map();
    this.init();
  }

  init() {
    // Create word reveal animations
    document.querySelectorAll(".cinematic-word").forEach((word, index) => {
      gsap.set(word, { y: 100, opacity: 0 });

      ScrollTrigger.create({
        trigger: word.closest(".section"),
        start: "top 80%",
        onEnter: () => {
          gsap.to(word, {
            y: 0,
            opacity: 1,
            duration: 1,
            delay: index * 0.1,
            ease: "power3.out",
          });
        },
      });
    });

    // Create section entrance animations
    document.querySelectorAll(".section").forEach((section, index) => {
      const content = section.querySelector(".section-content");
      gsap.set(content, { opacity: 0, y: 50 });

      ScrollTrigger.create({
        trigger: section,
        start: "top 80%",
        onEnter: () => {
          gsap.to(content, {
            opacity: 1,
            y: 0,
            duration: 1.2,
            ease: "power3.out",
          });
        },
      });
    });

    // Product reveal animation
    const productCanvas = document.getElementById("product-canvas-container");
    ScrollTrigger.create({
      trigger: "#sprite",
      start: "top 60%",
      onEnter: () => {
        gsap.to(productCanvas, {
          opacity: 1,
          scale: 1,
          duration: 1.5,
          ease: "back.out(1.7)",
        });
      },
    });

    // Audio card animations
    document.querySelectorAll(".audio-card").forEach((card) => {
      gsap.set(card, { opacity: 0, y: 30 });

      ScrollTrigger.create({
        trigger: card,
        start: "top 90%",
        onEnter: () => {
          gsap.to(card, {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power2.out",
          });
        },
      });
    });

    // Quiz option animations
    document.querySelectorAll(".quiz-option").forEach((option) => {
      option.addEventListener("mouseenter", () => {
        gsap.to(option, {
          scale: 1.05,
          duration: 0.3,
          ease: "power2.out",
        });
      });

      option.addEventListener("mouseleave", () => {
        gsap.to(option, {
          scale: 1,
          duration: 0.3,
          ease: "power2.out",
        });
      });
    });
  }
}

// ====================
// QUIZ MANAGER
// ====================
class QuizManager {
  constructor() {
    this.currentQuestion = 1;
    this.selectedOption = null;
    this.init();
  }

  init() {
    document.querySelectorAll(".quiz-option").forEach((option) => {
      option.addEventListener("click", (e) => {
        const selected = e.currentTarget;
        const optionType = selected.getAttribute("data-option");

        // Remove active class from all options
        document.querySelectorAll(".quiz-option").forEach((opt) => {
          opt.classList.remove("active");
          gsap.to(opt, {
            scale: 1,
            duration: 0.3,
            ease: "power2.out",
          });
        });

        // Add active class to selected
        selected.classList.add("active");
        this.selectedOption = optionType;

        // Animate selection
        gsap.to(selected, {
          scale: 1.1,
          duration: 0.3,
          ease: "back.out(1.7)",
        });

        // Show next step (simulated)
        setTimeout(() => {
          this.showNextStep();
        }, 800);
      });
    });
  }

  showNextStep() {
    // In a full implementation, this would load the next question
    // For demo, show a message
    const message = `You selected ${
      this.selectedOption === "documentary" ? "Documentary" : "Comedy"
    }!`;
    console.log(message);

    // Could trigger GSAP animation to next section
    gsap.to(window, {
      duration: 1.5,
      scrollTo: { y: "#find", offsetY: 100 },
      ease: "power2.inOut",
    });
  }
}

// ====================
// SCROLL MANAGER
// ====================
class ScrollManager {
  constructor(appState, sceneManager) {
    this.appState = appState;
    this.sceneManager = sceneManager;
    this.lastScroll = 0;
    this.init();
  }

  init() {
    // Scroll progress animation
    gsap.to(".scroll-progress-bar", {
      scaleX: 1,
      duration: 0.1,
      ease: "none",
      scrollTrigger: {
        trigger: "body",
        start: "top top",
        end: "bottom bottom",
        scrub: true,
      },
    });

    // Section detection
    this.appState.sections.forEach((sectionId) => {
      const section = document.getElementById(sectionId);
      if (section) {
        ScrollTrigger.create({
          trigger: section,
          start: "top 50%",
          end: "bottom 50%",
          onEnter: () => {
            this.appState.updateSection(sectionId);
            this.sceneManager.setScene(this.appState.sceneState);
          },
          onEnterBack: () => {
            this.appState.updateSection(sectionId);
            this.sceneManager.setScene(this.appState.sceneState);
          },
        });
      }
    });

    // Smooth scrolling for nav dots
    document.querySelectorAll(".nav-dot").forEach((dot, index) => {
      dot.addEventListener("click", () => {
        const sectionId = this.appState.sections[index];
        const section = document.getElementById(sectionId);

        if (section) {
          gsap.to(window, {
            duration: 1.5,
            scrollTo: { y: section, offsetY: 100 },
            ease: "power2.inOut",
          });
        }
      });
    });

    // Parallax effects
    gsap.to(".bg-layer", {
      y: (i, target) => ScrollTrigger.maxScroll(window) * 0.3,
      ease: "none",
      scrollTrigger: {
        scrub: true,
      },
    });
  }
}

// ====================
// PRODUCT VISUALIZATION
// ====================
class ProductVisualizer {
  constructor() {
    this.canvas = document.getElementById("product-canvas");
    this.ctx = this.canvas.getContext("2d");
    this.angle = 0;
    this.init();
  }

  init() {
    this.animate();
  }

  animate() {
    this.angle += 0.01;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw product visualization
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const radius = 80;

    // Outer ring
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    this.ctx.strokeStyle = "rgba(0, 255, 136, 0.3)";
    this.ctx.lineWidth = 4;
    this.ctx.stroke();

    // Rotating elements
    for (let i = 0; i < 8; i++) {
      const elementAngle = this.angle + (i * Math.PI) / 4;
      const x = centerX + Math.cos(elementAngle) * radius;
      const y = centerY + Math.sin(elementAngle) * radius;

      this.ctx.beginPath();
      this.ctx.arc(x, y, 10, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(0, 255, 136, ${
        0.5 + 0.3 * Math.sin(this.angle + i)
      })`;
      this.ctx.fill();
    }

    // Center
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
    this.ctx.fillStyle = "rgba(0, 255, 136, 0.8)";
    this.ctx.fill();

    requestAnimationFrame(() => this.animate());
  }
}

// ====================
// LOADING MANAGER
// ====================
class LoadingManager {
  constructor() {
    this.progress = 0;
    this.totalAssets = 5; // Audio files + other assets
    this.loadedAssets = 0;
  }

  updateProgress() {
    this.loadedAssets++;
    this.progress = (this.loadedAssets / this.totalAssets) * 100;

    const progressBar = document.querySelector(".loading-progress-bar");
    if (progressBar) {
      progressBar.style.width = `${this.progress}%`;
    }

    if (this.progress >= 100) {
      setTimeout(() => this.completeLoading(), 500);
    }
  }

  completeLoading() {
    const loadingScreen = document.getElementById("loading-screen");
    gsap.to(loadingScreen, {
      opacity: 0,
      duration: 0.8,
      ease: "power2.inOut",
      onComplete: () => {
        loadingScreen.style.display = "none";

        // Animate initial content
        gsap.to(".cinematic-word", {
          y: 0,
          opacity: 1,
          duration: 1.5,
          stagger: 0.1,
          ease: "power3.out",
          delay: 0.5,
        });
      },
    });
  }
}

// ====================
// APPLICATION INITIALIZATION
// ====================
document.addEventListener("DOMContentLoaded", () => {
  // Initialize GSAP
  gsap.registerPlugin(ScrollTrigger);

  // Create managers
  const appState = new AppState();
  const sceneManager = new SceneManager();
  const audioManager = new AudioManager();
  const animationManager = new AnimationManager();
  const quizManager = new QuizManager();
  const productVisualizer = new ProductVisualizer();
  const loadingManager = new LoadingManager();
  const scrollManager = new ScrollManager(appState, sceneManager);

  // Simulate asset loading
  setTimeout(() => loadingManager.updateProgress(), 300);
  setTimeout(() => loadingManager.updateProgress(), 600);
  setTimeout(() => loadingManager.updateProgress(), 900);
  setTimeout(() => loadingManager.updateProgress(), 1200);
  setTimeout(() => loadingManager.updateProgress(), 1500);

  // Store references globally for debugging
  window.app = {
    appState,
    sceneManager,
    audioManager,
    animationManager,
    quizManager,
    scrollManager,
  };
});
