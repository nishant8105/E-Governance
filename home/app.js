// script.js
// FLIP animation controller: grid -> tab-bar -> info-panel and back.
// Expects these ids/classes in HTML:
// #cardGrid .card (each .card has data-service and .viewBtn inside)
// #tabs .tab
// #infoPanel
// #topBar
// #backBtn

(() => {
  const cardGrid = document.getElementById("cardGrid");
  const cards = Array.from(document.querySelectorAll(".card"));
  const tabsEl = document.getElementById("tabs");
  const tabEls = Array.from(document.querySelectorAll(".tab"));
  const infoPanel = document.getElementById("infoPanel");
  const backBtn = document.getElementById("backBtn");
  const topBar = document.getElementById("topBar");

  let animating = false;
  let activeService = null;

  // content (can be moved to JSON or fetched)
  const infoContent = {
    "Bhim UPI": `
<h2>BHIM UPI</h2>
<p>BHIM UPI is a fast and secure payment system for bank-to-bank transfers.</p>

<h3>Key Features:</h3>
<ul>
  <li>Send/Receive money instantly</li>
  <li>Scan & Pay using QR code</li>
  <li>Check balance</li>
  <li>Supports all banks</li>
</ul>

<h3>How to Set Up:</h3>
<ol>
  <li>Download BHIM UPI app</li>
  <li>Verify mobile number linked to bank</li>
  <li>Select your bank</li>
  <li>Set UPI PIN using ATM card</li>
  <li>Start sending money</li>
</ol>

<h3>Requirements:</h3>
<ul>
  <li>Mobile number linked with your bank</li>
  <li>ATM card for UPI PIN</li>
</ul>

<h3>Common Problems:</h3>
<ul>
  <li>OTP not coming → Check network</li>
  <li>Wrong PIN → Reset UPI PIN</li>
</ul>
`,
    DigiLocker: `
<h2>DigiLocker</h2>
<p>DigiLocker is a secure digital document storage system by Government of India.</p>

<h3>Key Features:</h3>
<ul>
  <li>Download Aadhaar, PAN, Driving License</li>
  <li>Vehicle RC, Insurance</li>
  <li>School/College marksheets</li>
  <li>No need to carry physical copies</li>
</ul>

<h3>How to Use:</h3>
<ol>
  <li>Open DigiLocker</li>
  <li>Enter mobile number</li>
  <li>Enter OTP</li>
  <li>Link Aadhaar</li>
  <li>Fetch documents digitally</li>
</ol>

<h3>Required:</h3>
<ul>
  <li>Mobile number</li>
  <li>Aadhaar (optional but recommended)</li>
</ul>

<h3>Common Problems:</h3>
<ul>
  <li>OTP delay → Wait or retry</li>
  <li>Document not loading → Try from “Get Documents” again</li>
</ul>`,
    NVSP: `
<h2>NVSP</h2>
<p>National Voters' Service Portal for all voter-related services.</p>

<h3>Features:</h3>
<ul>
  <li>Search name in Electoral Roll</li>
  <li>Apply for new Voter ID card</li>
  <li>Correction of entries</li>
  <li>Track application status</li>
</ul>

<h3>How to Apply:</h3>
<ol>
  <li>Register on NVSP portal</li>
  <li>Fill Form 6 for new voter</li>
  <li>Upload photo and address proof</li>
  <li>Submit application</li>
</ol>

<h3>Documents Needed:</h3>
<ul>
  <li>Passport size photo</li>
  <li>Address proof (Aadhaar/Passport/Bill)</li>
  <li>Age proof (if between 18-21)</li>
</ul>

<h3>Common Problems:</h3>
<ul>
  <li>Status not updating → Check after 1 week</li>
  <li>EPIC number not found → Verify details</li>
</ul>
`,

    UMANG: `
<h2>UMANG</h2>
<p>UMANG provides 100+ government services in one app.</p>

<h3>Popular Services:</h3>
<ul>
  <li>Aadhaar services</li>
  <li>Gas Booking</li>
  <li>EPFO (PF balance)</li>
  <li>Pension details</li>
  <li>Scholarship details</li>
</ul>

<h3>Steps to Use:</h3>
<ol>
  <li>Install UMANG</li>
  <li>Enter mobile number</li>
  <li>Enter OTP</li>
  <li>Create Login PIN</li>
  <li>Select service</li>
</ol>

<h3>Requirements:</h3>
<ul>
  <li>Mobile number</li>
  <li>Active internet</li>
</ul>

<h3>Common Problems:</h3>
<ul>
  <li>OTP not coming → Retry after 30 sec</li>
  <li>Service not loading → Check network</li>
</ul>
`,
    mAadhaar: `
<h2>mAadhaar</h2>
<p>Official Aadhaar app to carry your Aadhaar on your smartphone.</p>

<h3>Features:</h3>
<ul>
  <li>Download Aadhaar</li>
  <li>Show Aadhaar in offline mode</li>
  <li>Update Address</li>
  <li>Lock/Unlock Biometrics</li>
</ul>

<h3>How to Use:</h3>
<ol>
  <li>Install mAadhaar app</li>
  <li>Register with mobile number</li>
  <li>Create 4-digit password</li>
  <li>Link Aadhaar number</li>
</ol>
`,
    mParivahan: `
<h2>mParivahan</h2>
<p>Access vehicle registration and driving license details.</p>

<h3>Features:</h3>
<ul>
  <li>Virtual RC & DL</li>
  <li>Challan status</li>
  <li>Pay road tax</li>
  <li>Locate RTO</li>
</ul>

<h3>How to Use:</h3>
<ol>
  <li>Sign up with mobile number</li>
  <li>Enter Vehicle Number for RC</li>
  <li>Enter DL Number for License</li>
</ol>
`,
    IRCTC: `
<h2>IRCTC Rail Connect</h2>
<p>Official app for booking Indian Railway train tickets.</p>

<h3>Features:</h3>
<ul>
  <li>Book Train Tickets</li>
  <li>Check PNR Status</li>
  <li>Live Train Status</li>
  <li>Order Food on Train</li>
</ul>

<h3>How to Book:</h3>
<ol>
  <li>Login with IRCTC User ID</li>
  <li>Select From & To stations</li>
  <li>Choose Date & Train</li>
  <li>Enter Passenger Details</li>
  <li>Pay via UPI/Card</li>
</ol>
`,
    "Voter Helpline": `
<h2>Voter Helpline</h2>
<p>Comprehensive app for voter services by Election Commission of India.</p>

<h3>Features:</h3>
<ul>
  <li>Search your name in Electoral Roll</li>
  <li>Forms for New Voter Registration</li>
  <li>Complaint Registration</li>
  <li>Election Results</li>
</ul>
`,
    Ayushman: `
<h2>Ayushman App</h2>
<p>Manage your Ayushman Bharat Pradhan Mantri Jan Arogya Yojana account.</p>

<h3>Features:</h3>
<ul>
  <li>Check Eligibility</li>
  <li>Find Empanelled Hospitals</li>
  <li>Download Ayushman Card</li>
  <li>Grievance Redressal</li>
</ul>
`,
    MyGov: `
<h2>MyGov</h2>
<p>Platform for citizen engagement and participation in governance.</p>

<h3>Features:</h3>
<ul>
  <li>Participate in Groups & Tasks</li>
  <li>Share Ideas & Suggestions</li>
  <li>Take Polls & Surveys</li>
  <li>Stay Updated with Gov Initiatives</li>
</ul>
`,
  };
  


  // helpers
  const rect = (el) => el.getBoundingClientRect();
  const wait = (ms) => new Promise((res) => setTimeout(res, ms));

  // create a fixed-position clone for a DOM element (visual copy)
  function makeClone(el) {
    const r = rect(el);
    const clone = el.cloneNode(true);
    clone.classList.add("flip-clone");
    clone.style.left = `${r.left}px`;
    clone.style.top = `${r.top}px`;
    clone.style.width = `${r.width}px`;
    clone.style.height = `${r.height}px`;
    clone.style.margin = "0";
    clone.style.transform = "none";
    clone.style.transition = "none";
    document.body.appendChild(clone);
    // force layout
    void clone.offsetWidth;
    return { clone, startRect: r };
  }

  // set active tab visuals + info text
  function setActiveTab(name) {
    tabEls.forEach((t) => t.classList.toggle("active", t.textContent === name));
    infoPanel.innerHTML = infoContent[name] || "";
  }

  // enable/disable topBar pointer events (so Back button works)
  function setTopBarInteractive(enable) {
    topBar.style.pointerEvents = enable ? "auto" : "none";
  }

  // MAIN: animate grid -> tabs
  async function animateGridToTabs(serviceName) {
    if (animating) return;
    animating = true;
    activeService = serviceName;

    // 1) create clones for each card
    const clones = cards.map((c) => makeClone(c));

    // 2) hide the grid visually (fade) but keep off-DOM after short delay
    cardGrid.style.transition = "opacity .26s ease";
    cardGrid.style.opacity = "0";
    // hide after fade
    setTimeout(() => {
      cardGrid.style.display = "none";
    }, 260);

    // 3) ensure tabs container is in layout so we can measure final positions
    tabsEl.style.display = "flex";
    tabsEl.style.opacity = "0";
    tabsEl.style.transform = "translateY(-6px)";
    tabsEl.style.pointerEvents = "none";
    setTopBarInteractive(false); // temporarily non-interactive while animating

    // small timeout to ensure tabs rendered
    await wait(40);

    // measure final positions of each tab
    const tabRects = tabEls.map((t) => rect(t));

    // 4) animate each clone to its corresponding tab rect (1:1 by order)
    clones.forEach((cObj, i) => {
      const { clone, startRect } = cObj;
      const to = tabRects[i];
      const deltaX = to.left - startRect.left;
      const deltaY = to.top - startRect.top;
      const scaleX = to.width / startRect.width;
      const scaleY = to.height / startRect.height;

      clone.style.transition =
        "transform .62s cubic-bezier(.2,.9,.25,1), width .62s, height .62s, border-radius .45s, opacity .3s";
      clone.style.transformOrigin = "top left";
      // animate via transform (translate+scale) for smoothness
      requestAnimationFrame(() => {
        clone.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})`;
        clone.style.borderRadius = "28px";
      });
    });

    // reveal tabs (fade-in) slightly delayed
    setTimeout(() => {
      tabsEl.style.opacity = "1";
      tabsEl.style.transform = "translateY(0)";
    }, 320);

    // wait for animation duration
    await wait(700);

    // clean clones
    clones.forEach((c) => {
      if (c.clone && c.clone.parentNode)
        c.clone.parentNode.removeChild(c.clone);
    });

    // ensure tabs fully visible & interactive
    tabsEl.style.opacity = "1";
    tabsEl.style.pointerEvents = "auto";
    setTopBarInteractive(true);

    // show info panel & set active content
    infoPanel.style.display = "block";
    // small delay then animate info panel
    await wait(20);
    infoPanel.style.opacity = "1";
    infoPanel.style.transform = "translateY(0)";
    setActiveTab(serviceName);

    // show back button
    backBtn.style.display = "inline-block";

    animating = false;
  }

  // MAIN: animate tabs -> grid (reverse)
  async function animateTabsToGrid() {
    if (animating) return;
    animating = true;

    // create clones at current tab positions (we'll animate them back to card positions)
    const tabRects = tabEls.map((t) => rect(t));
    const targetRects = cards.map((c) => rect(c));

    const clones = tabRects.map((tr, i) => {
      const clone = document.createElement("div");
      clone.className = "flip-clone";
      clone.style.left = `${tr.left}px`;
      clone.style.top = `${tr.top}px`;
      clone.style.width = `${tr.width}px`;
      clone.style.height = `${tr.height}px`;
      clone.style.borderRadius = "28px";
      // minimal visible style to match tabs (white)
      clone.style.background = "#fff";
      document.body.appendChild(clone);
      return { clone, start: tr, target: targetRects[i] };
    });

    // hide tabs & info panel immediately (fade)
    tabsEl.style.opacity = "0";
    tabsEl.style.pointerEvents = "none";
    setTopBarInteractive(false);
    infoPanel.style.opacity = "0";
    infoPanel.style.transform = "translateY(8px)";

    setTimeout(() => {
      tabsEl.style.display = "none";
      infoPanel.style.display = "none";
    }, 260);

    await wait(40);

    // animate clones to card target rects
    clones.forEach((cObj) => {
      const { clone, start, target } = cObj;
      const deltaX = target.left - start.left;
      const deltaY = target.top - start.top;
      const scaleX = target.width / start.width;
      const scaleY = target.height / start.height;
      clone.style.transition =
        "transform .64s cubic-bezier(.2,.9,.25,1), width .64s, height .64s, border-radius .45s";
      clone.style.transformOrigin = "top left";
      requestAnimationFrame(() => {
        clone.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})`;
        clone.style.borderRadius = "14px";
      });
    });

    // wait then clean up clones and restore grid
    await wait(700);
    clones.forEach((c) => {
      if (c.clone && c.clone.parentNode)
        c.clone.parentNode.removeChild(c.clone);
    });

    // restore card grid
    cardGrid.style.display = "flex";
    // ensure layout has had a tick
    await wait(8);
    cardGrid.style.opacity = "1";

    // hide back button
    backBtn.style.display = "none";

    animating = false;
  }

  // attach events
  cards.forEach((card) => {
    const btn = card.querySelector(".viewBtn");
    btn.addEventListener("click", (e) => {
      const service = card.getAttribute("data-service");
      animateGridToTabs(service);
    });
  });

  tabEls.forEach((t) => {
    t.addEventListener("click", () => {
      if (animating) return;
      setActiveTab(t.textContent);
    });
  });

  backBtn.addEventListener("click", () => {
    if (animating) return;
    animateTabsToGrid();
  });

  // accessibility: Enter/Space activate focused tab/back/button
  document.addEventListener("keydown", (e) => {
    const active = document.activeElement;
    if (!active) return;
    if (
      (e.key === "Enter" || e.key === " ") &&
      active.classList.contains("tab")
    ) {
      active.click();
      e.preventDefault();
    }
    if ((e.key === "Enter" || e.key === " ") && active === backBtn) {
      backBtn.click();
      e.preventDefault();
    }
  });

  // on resize: if user resizes mid-animation, remove any clones and reset state safely
  let resizeTimer = null;
  window.addEventListener("resize", () => {
    // debounce
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      // if animating, cancel and reset - simpler approach:
      if (animating) {
        // remove any leftover clones
        document.querySelectorAll(".flip-clone").forEach((n) => n.remove());
        animating = false;
      }
      // hide tabs + info and show grid if tabs were visible
      if (tabsEl.style.display !== "none") {
        tabsEl.style.display = "none";
        tabsEl.style.opacity = "0";
        setTopBarInteractive(false);
      }
      if (infoPanel.style.display !== "none") {
        infoPanel.style.display = "none";
        infoPanel.style.opacity = "0";
      }
      cardGrid.style.display = "flex";
      cardGrid.style.opacity = "1";
      backBtn.style.display = "none";
    }, 180);
  });

  // initial state
  tabsEl.style.display = "none";
  infoPanel.style.display = "none";
  setTopBarInteractive(false);
})();
