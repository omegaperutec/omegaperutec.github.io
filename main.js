document.documentElement.classList.remove("no-js");

const yearNode = document.querySelector("#current-year");
const siteHeader = document.querySelector(".site-header");
const navLinks = Array.from(document.querySelectorAll('.site-nav a[href^="#"]'));
const sections = navLinks
  .map((link) => {
    const id = link.getAttribute("href");

    if (!id) {
      return null;
    }

    const section = document.querySelector(id);

    return section ? { link, section } : null;
  })
  .filter(Boolean);

if (yearNode) {
  yearNode.textContent = String(new Date().getFullYear());
}

const syncHeaderState = () => {
  if (!siteHeader) {
    return;
  }

  siteHeader.classList.toggle("is-scrolled", window.scrollY > 18);
};

const syncActiveSection = () => {
  if (sections.length === 0) {
    return;
  }

  const marker = window.scrollY + 160;
  let current = sections[0];

  for (const item of sections) {
    if (marker >= item.section.offsetTop) {
      current = item;
    }
  }

  for (const item of sections) {
    item.link.classList.toggle("is-active", item === current);
  }
};

syncHeaderState();
syncActiveSection();

window.addEventListener("scroll", () => {
  syncHeaderState();
  syncActiveSection();
}, { passive: true });

const items = document.querySelectorAll("[data-reveal]");

if ("IntersectionObserver" in window && items.length > 0) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      }
    },
    {
      rootMargin: "0px 0px -12% 0px",
      threshold: 0.18,
    },
  );

  for (const item of items) {
    observer.observe(item);
  }
} else {
  for (const item of items) {
    item.classList.add("is-visible");
  }
}

const migrationVisuals = document.querySelectorAll(".migration-visual");

for (const visual of migrationVisuals) {
  const stageButtons = Array.from(visual.querySelectorAll(".migration-stage"));
  const stagePanels = Array.from(visual.querySelectorAll("[data-stage-panel]"));

  if (stageButtons.length === 0 || stagePanels.length === 0) {
    continue;
  }

  let activeStage = 0;
  let autoRotate = null;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const setActiveStage = (nextStage) => {
    activeStage = nextStage;
    visual.setAttribute("data-active-stage", String(nextStage));

    for (const button of stageButtons) {
      const isActive = Number(button.dataset.stage) === nextStage;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
      button.tabIndex = isActive ? 0 : -1;
    }

    for (const panel of stagePanels) {
      const isActive = Number(panel.dataset.stagePanel) === nextStage;
      panel.classList.toggle("is-active", isActive);
      panel.hidden = !isActive;
    }
  };

  const startRotation = () => {
    if (reduceMotion || stageButtons.length < 2) {
      return;
    }

    window.clearInterval(autoRotate);
    autoRotate = window.setInterval(() => {
      const nextStage = (activeStage + 1) % stageButtons.length;
      setActiveStage(nextStage);
    }, 4200);
  };

  for (const button of stageButtons) {
    button.addEventListener("click", () => {
      setActiveStage(Number(button.dataset.stage) || 0);
      startRotation();
    });
  }

  visual.addEventListener("mouseenter", () => {
    window.clearInterval(autoRotate);
  });

  visual.addEventListener("mouseleave", startRotation);

  setActiveStage(0);
  startRotation();
}

const PEN_FORMATTER = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});

const PRICING = {
  cableado: { base: 420, point: 26, meter: 3.4, rack: 560 },
  equipos: { base: 1100, point: 40, meter: 1.2, rack: 900 },
  solucion: { base: 1800, point: 58, meter: 4.1, rack: 980 },
  migracion: { base: 1350, point: 34, meter: 2.2, rack: 760 },
};

const URGENCY_MULTIPLIER = {
  normal: 1,
  prioritario: 1.14,
  critico: 1.32,
};

const quoteForm = document.querySelector("#quote-form");

if (quoteForm instanceof HTMLFormElement) {
  const serviceTypeInput = quoteForm.querySelector("#service-type");
  const pointsInput = quoteForm.querySelector("#points");
  const metersInput = quoteForm.querySelector("#meters");
  const racksInput = quoteForm.querySelector("#racks");
  const urgencyInput = quoteForm.querySelector("#urgency");
  const subtotalNode = quoteForm.querySelector("#quote-subtotal");
  const taxNode = quoteForm.querySelector("#quote-tax");
  const totalNode = quoteForm.querySelector("#quote-total");
  const statusNode = quoteForm.querySelector("#form-status");
  const emailLink = quoteForm.querySelector("#email-link");

  const toNumber = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const formatPen = (value) => PEN_FORMATTER.format(value);

  const buildQuote = () => {
    const service = serviceTypeInput instanceof HTMLSelectElement ? serviceTypeInput.value : "cableado";
    const profile = PRICING[service] || PRICING.cableado;
    const points = Math.max(0, toNumber(pointsInput && pointsInput.value, 0));
    const meters = Math.max(0, toNumber(metersInput && metersInput.value, 0));
    const racks = Math.max(0, toNumber(racksInput && racksInput.value, 0));
    const urgency = urgencyInput instanceof HTMLSelectElement ? urgencyInput.value : "normal";
    const multiplier = URGENCY_MULTIPLIER[urgency] || URGENCY_MULTIPLIER.normal;

    const baseAmount = profile.base + points * profile.point + meters * profile.meter + racks * profile.rack;
    const subtotal = baseAmount * multiplier;
    const tax = subtotal * 0.18;
    const total = subtotal + tax;

    return { subtotal, tax, total };
  };

  const buildEmailBody = (formData, quote) => {
    return [
      "Hola equipo Omega Peru Tec,",
      "",
      "Quiero solicitar una cotizacion preliminar para mi proyecto:",
      "",
      `Nombre: ${formData.get("nombre") || ""}`,
      `Empresa: ${formData.get("empresa") || ""}`,
      `Email: ${formData.get("email") || ""}`,
      `Telefono: ${formData.get("telefono") || ""}`,
      `Servicio: ${formData.get("servicio") || ""}`,
      `Puntos de red: ${formData.get("puntos") || ""}`,
      `Metros de cableado: ${formData.get("metros") || ""}`,
      `Racks / gabinetes: ${formData.get("racks") || ""}`,
      `Urgencia: ${formData.get("urgencia") || ""}`,
      "",
      "Notas del proyecto:",
      `${formData.get("mensaje") || "Sin notas adicionales."}`,
      "",
      "Cotizacion automatica referencial:",
      `Subtotal: ${formatPen(quote.subtotal)}`,
      `IGV: ${formatPen(quote.tax)}`,
      `Total estimado: ${formatPen(quote.total)}`,
    ].join("\n");
  };

  const updateQuotePreview = () => {
    const quote = buildQuote();

    if (subtotalNode) {
      subtotalNode.textContent = formatPen(quote.subtotal);
    }
    if (taxNode) {
      taxNode.textContent = formatPen(quote.tax);
    }
    if (totalNode) {
      totalNode.textContent = formatPen(quote.total);
    }

    if (emailLink instanceof HTMLAnchorElement) {
      const data = new FormData(quoteForm);
      const subject = encodeURIComponent("Solicitud de cotizacion - Omega Peru Tec");
      const body = encodeURIComponent(buildEmailBody(data, quote));
      emailLink.href = `mailto:comercial@omegaperutec.com?subject=${subject}&body=${body}`;
    }

    return quote;
  };

  quoteForm.addEventListener("input", updateQuotePreview);
  quoteForm.addEventListener("change", updateQuotePreview);

  quoteForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!quoteForm.reportValidity()) {
      if (statusNode) {
        statusNode.classList.add("error");
        statusNode.textContent = "Revisa los campos requeridos para continuar.";
      }
      return;
    }

    const quote = updateQuotePreview();
    const data = new FormData(quoteForm);
    const lead = {
      createdAt: new Date().toISOString(),
      nombre: String(data.get("nombre") || ""),
      empresa: String(data.get("empresa") || ""),
      email: String(data.get("email") || ""),
      telefono: String(data.get("telefono") || ""),
      servicio: String(data.get("servicio") || ""),
      puntos: toNumber(data.get("puntos"), 0),
      metros: toNumber(data.get("metros"), 0),
      racks: toNumber(data.get("racks"), 0),
      urgencia: String(data.get("urgencia") || ""),
      mensaje: String(data.get("mensaje") || ""),
      subtotal: Number(quote.subtotal.toFixed(2)),
      igv: Number(quote.tax.toFixed(2)),
      total: Number(quote.total.toFixed(2)),
    };

    try {
      const savedRaw = localStorage.getItem("omega_leads");
      const saved = savedRaw ? JSON.parse(savedRaw) : [];
      const list = Array.isArray(saved) ? saved : [];
      list.unshift(lead);
      localStorage.setItem("omega_leads", JSON.stringify(list.slice(0, 50)));
    } catch (_error) {
      // No bloquea el flujo si el navegador no permite almacenamiento.
    }

    if (statusNode) {
      statusNode.classList.remove("error");
      statusNode.textContent =
        "Solicitud lista. Se actualizo el correo prellenado y guardamos una copia local de respaldo.";
    }

    if (emailLink instanceof HTMLAnchorElement) {
      window.location.href = emailLink.href;
    }
  });

  updateQuotePreview();
}
