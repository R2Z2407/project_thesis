// Wait for the entire page (including images) to load
$(window).on("load", function () {
  // Hide the loading screen
  $("#loading-overlay").addClass("hidden");
});

// Run scripts after the DOM is ready
$(document).ready(function () {
  // --- Script for repeating reveal animation on scroll ---
  function revealOnScroll() {
    const windowHeight = $(window).height();
    const windowScrollTop = $(window).scrollTop();
    $(".reveal").each(function () {
      const element = $(this);
      const elementTop = element.offset().top;
      if (elementTop < windowScrollTop + windowHeight - 50) {
        element.addClass("visible");
      } else {
        element.removeClass("visible");
      }
    });
  }
  $(window).on("scroll", revealOnScroll);
  revealOnScroll();

  // --- Script for background zoom effect on scroll ---
  $(window).on("scroll", function () {
    const scrollTop = $(window).scrollTop();
    let homeScale = 120 - scrollTop * 0.03;
    homeScale = Math.max(100, homeScale);
    $("#home").css("background-size", homeScale + "%");
    const resultSection = $("#result");
    if (resultSection.length) {
      const resultTop = resultSection.offset().top;
      const windowHeight = $(window).height();
      if (scrollTop + windowHeight > resultTop) {
        const scrollInside = scrollTop + windowHeight - resultTop;
        let resultScale = 100 + scrollInside * 0.03;
        resultScale = Math.min(120, resultScale);
        resultSection.css("background-size", resultScale + "%");
      } else {
        resultSection.css("background-size", "100%");
      }
    }
  });

  // --- Script for floating navigation menu ---
  $("#nav-toggle-btn").on("click", function () {
    $("#floating-nav").toggleClass("open");
    $(this).toggleClass("open");
  });

  // --- Script for image scroller/carousel ---
  const $scroller = $(".image-scroller");
  if ($scroller.length) {
    const $filmstrip = $scroller.find(".scroller-filmstrip");
    const slideCount = $filmstrip.find("img").length;
    const $dotsContainer = $scroller.find(".scroller-dots");
    let currentIndex = 0;
    let autoScrollInterval;
    for (let i = 0; i < slideCount; i++) {
      $dotsContainer.append("<span></span>");
    }
    const $dots = $dotsContainer.find("span");
    function goToSlide(index) {
      currentIndex = (index + slideCount) % slideCount;
      $filmstrip.css("transform", `translateX(-${currentIndex * 100}%)`);
      $dots.removeClass("active").eq(currentIndex).addClass("active");
    }
    function startAutoScroll() {
      stopAutoScroll();
      autoScrollInterval = setInterval(() => goToSlide(currentIndex + 1), 4000);
    }
    function stopAutoScroll() {
      clearInterval(autoScrollInterval);
    }
    $scroller.find(".next-btn").on("click", () => {
      goToSlide(currentIndex + 1);
      startAutoScroll();
    });
    $scroller.find(".prev-btn").on("click", () => {
      goToSlide(currentIndex - 1);
      startAutoScroll();
    });
    $dots.on("click", function () {
      goToSlide($(this).index());
      startAutoScroll();
    });
    goToSlide(0);
    startAutoScroll();
  }

  // --- SCRIPT FOR STICKY IMAGE & AUTOMATIC CHANGE ON SCROLL ---
  function setupScrollObserver($featureItem) {
    const $components = $featureItem.find(".process-component");
    const $image = $featureItem.find(".feature-image");
    const observerOptions = {
      root: null,
      rootMargin: "-40% 0px -40% 0px",
      threshold: 0,
    };
    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        const component = $(entry.target);
        if (entry.isIntersecting) {
          const newImgSrc = component.data("img-src");
          if (newImgSrc && $image.attr("src") !== newImgSrc) {
            $image.fadeOut(150, function () {
              $(this).attr("src", newImgSrc).fadeIn(150);
            });
          }
          component.addClass("active");
        } else {
          component.removeClass("active");
        }
      });
    };
    const observer = new IntersectionObserver(
      observerCallback,
      observerOptions
    );
    $components.each(function () {
      observer.observe(this);
    });
    $featureItem.data("observer", observer);
  }

  $(".read-more-btn").on("click", function () {
    const $btn = $(this);
    const $moreContent = $btn.siblings(".more-content");
    const $featureItem = $btn.closest(".feature-item");
    const $imageWrapper = $featureItem.find(".feature-image-wrapper");
    const $contentWrapper = $featureItem.find(".feature-content-wrapper");
    const $image = $featureItem.find(".feature-image");

    $moreContent.slideToggle(400, function () {
      if ($moreContent.is(":visible")) {
        $btn.html('Sembunyikan <i class="fas fa-chevron-up"></i>');
        const contentHeight = $contentWrapper.outerHeight();
        $imageWrapper.css("height", contentHeight + "px");
        setupScrollObserver($featureItem);
      } else {
        $btn.html('Selengkapnya <i class="fas fa-chevron-down"></i>');
        $imageWrapper.css("height", "auto");
        const observer = $featureItem.data("observer");
        if (observer) {
          observer.disconnect();
          $featureItem.removeData("observer");
        }
        $image.attr("src", $image.data("original-src"));
        $featureItem.find(".process-component").removeClass("active");
      }
    });
  });

  // --- SCRIPT FOR IMAGE POP-UP MODAL (ADVANCED) ---
  const $modal = $("#image-modal");
  const $modalImage = $("#modal-image");

  // State variables
  let currentScale = 1.0;
  let translateX = 0;
  let translateY = 0;
  let isPanning = false;
  let startX, startY;
  let activeTool = "zoom-in";
  let lastClickedImage = null; // Untuk menyimpan referensi gambar yang diklik

  function updateTransform() {
    // Hanya update transform untuk zoom dan pan, bukan posisi
    $modalImage.css(
      "transform",
      `translate(${translateX}px, ${translateY}px) scale(${currentScale})`
    );
  }

  function setActiveTool(tool) {
    activeTool = tool;
    $(".modal-zoom-controls button").removeClass("active");
    $(`#${tool}-btn`).addClass("active");
    $modal.removeClass(
      "cursor-grab cursor-grabbing cursor-zoom-in cursor-zoom-out"
    );
    if (tool === "grab") $modal.addClass("cursor-grab");
    else if (tool === "zoom-in") $modal.addClass("cursor-zoom-in");
    else if (tool === "zoom-out") $modal.addClass("cursor-zoom-out");
  }

  // 1. Open Modal
  $("main").on("click", "img", function () {
    lastClickedImage = this; // Simpan elemen gambar yang diklik
    const rect = lastClickedImage.getBoundingClientRect(); // Dapatkan posisi & ukuran gambar sumber
    const imgSrc = $(lastClickedImage).attr("src");

    // Reset state
    currentScale = 1.0;
    translateX = 0;
    translateY = 0;
    $modalImage.css("transform", "translate(0, 0) scale(1)"); // Hapus transform lama

    // 1a. Set gambar modal ke posisi & ukuran gambar sumber (sebelum terlihat)
    $modalImage.attr("src", imgSrc).css({
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });

    // 1b. Tampilkan overlay latar belakang
    $modal.addClass("visible");
    $("body").addClass("scroll-lock");

    // 1c. Setelah delay singkat, animasikan gambar ke tengah layar
    setTimeout(() => {
      // Hitung ukuran akhir gambar (menjaga aspek rasio)
      const aspectRatio = rect.width / rect.height;
      const finalWidth = Math.min(
        window.innerWidth * 0.9,
        lastClickedImage.naturalWidth
      );
      const finalHeight = finalWidth / aspectRatio;

      $modalImage.css({
        top: `50%`,
        left: `50%`,
        width: `${finalWidth}px`,
        height: `${finalHeight}px`,
        transform: "translate(-50%, -50%) scale(1)", // Center & reset scale
      });
    }, 50); // Delay kecil agar transisi CSS terpicu

    setActiveTool("zoom-in");
  });

  // 2. Close Modal
  function closeModal() {
    if (!lastClickedImage) return;

    const rect = lastClickedImage.getBoundingClientRect(); // Dapatkan posisi terbaru (jika user scroll)

    // Animasikan gambar kembali ke posisi & ukuran aslinya
    $modalImage.css({
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      transform: "translate(0, 0) scale(1)", // Hapus centering & reset scale
    });

    $modal.removeClass("visible");
    $("body").removeClass("scroll-lock");
  }
  $(".modal-close").on("click", closeModal);

  // 3. Tool selection (tidak berubah)
  $("#zoom-in-btn").on("click", function (e) {
    e.stopPropagation();
    setActiveTool("zoom-in");
  });
  $("#zoom-out-btn").on("click", function (e) {
    e.stopPropagation();
    setActiveTool("zoom-out");
  });
  $("#grab-btn").on("click", function (e) {
    e.stopPropagation();
    setActiveTool("grab");
  });

  // 4. Image click action (tidak berubah)
  $modalImage.on("click", function (e) {
    e.stopPropagation();
    if (activeTool === "zoom-in") {
      currentScale += 0.4;
    } else if (activeTool === "zoom-out") {
      currentScale = Math.max(1.0, currentScale - 0.4); // Tidak bisa lebih kecil dari 1
    }
    // Jika kembali ke scale 1, reset posisi geser
    if (currentScale === 1.0) {
      translateX = 0;
      translateY = 0;
    }
    updateTransform();
  });

  // 5. Panning (Grab/Drag) Logic (tidak berubah)
  $modalImage.on("mousedown", function (e) {
    if (activeTool === "grab" && currentScale > 1.0) {
      e.preventDefault();
      isPanning = true;
      startX = e.clientX - translateX;
      startY = e.clientY - translateY;
      $modal.removeClass("cursor-grab").addClass("cursor-grabbing");
    }
  });
  $(window).on("mousemove", function (e) {
    if (isPanning) {
      e.preventDefault();
      translateX = e.clientX - startX;
      translateY = e.clientY - startY;
      updateTransform();
    }
  });
  $(window).on("mouseup", function (e) {
    if (isPanning) {
      isPanning = false;
      $modal.removeClass("cursor-grabbing").addClass("cursor-grab");
    }
  });
});
