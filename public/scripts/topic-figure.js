// 只由含互動圖的專題頁載入；圖上的事實皆取自已驗證的 figure 資料。
/** @typedef {{id:string,start:number,label:string,timeLabel?:string,readout:string|Record<string,string>}} Stage */
for (const figure of /** @type {NodeListOf<HTMLElement>} */ (
  document.querySelectorAll("[data-topic-figure]")
)) {
  const stages = /** @type {Stage[]} */ (
    JSON.parse(figure.dataset.stages ?? "[]")
  );
  const controls = figure.querySelector(".figure-controls");
  const variants = figure.querySelector(".figure-variants");
  const stageList = figure.querySelector("ol");
  const comparison = figure.querySelector(".figure-comparison");
  const slider = /** @type {HTMLInputElement | null} */ (
    figure.querySelector('input[type="range"]')
  );
  const play = /** @type {HTMLButtonElement | null} */ (
    figure.querySelector("[data-figure-play]")
  );
  const readout = figure.querySelector(".figure-readout");
  if (
    !(controls instanceof HTMLElement) ||
    !(variants instanceof HTMLElement) ||
    !(stageList instanceof HTMLElement) ||
    !slider ||
    !play ||
    !readout ||
    !stages.length
  )
    continue;
  const range = slider;
  const playButton = play;
  const announcementText = readout;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const duration = Number(range.max);
  let frame = 0;
  let timer = 0;
  let started = 0;
  let playing = false;
  let comparisonOnly = false;

  function stop() {
    cancelAnimationFrame(frame);
    clearInterval(timer);
    frame = 0;
    timer = 0;
    playing = false;
    playButton.textContent = "播放";
  }

  /** @param {number} time @param {Stage} [chosenStage] */
  function show(time, chosenStage) {
    if (!comparisonOnly) range.value = String(time);
    const stage =
      (comparisonOnly
        ? stages.find((item) => item.id === "colour")
        : chosenStage) ??
      [...stages].reverse().find((item) => time >= item.start);
    if (!stage) return;
    const variant = figure.dataset.variant;
    const detail =
      typeof stage.readout === "string"
        ? stage.readout
        : stage.readout[variant ?? ""];
    figure.dataset.stage = stage.id;
    const announcement = `${stage.label}：${detail}`;
    if (announcementText.textContent !== announcement)
      announcementText.textContent = announcement;
    if (comparisonOnly) range.removeAttribute("aria-valuetext");
    else
      range.setAttribute(
        "aria-valuetext",
        `${stage.timeLabel ?? `${time} 分鐘`}，${stage.label}：${detail}`,
      );
    for (const item of /** @type {NodeListOf<HTMLElement>} */ (
      figure.querySelectorAll("li[data-stage-id]")
    )) {
      item.dataset.current = String(item.dataset.stageId === stage.id);
    }
  }

  /** @param {number} now */
  function animate(now) {
    const time = Math.min(duration, ((now - started) / 6000) * duration);
    show(Math.round(time * 10) / 10);
    if (time >= duration) stop();
    else frame = requestAnimationFrame(animate);
  }

  function start() {
    stop();
    playing = true;
    playButton.textContent = "暫停";
    show(0);
    if (motion.matches) {
      let index = 0;
      timer = window.setInterval(() => {
        index += 1;
        const stage = stages[index];
        if (!stage) return stop();
        show(stage.start, stage);
        if (index === stages.length - 1) stop();
      }, 1200);
    } else {
      started = performance.now();
      frame = requestAnimationFrame(animate);
    }
  }

  controls.hidden = false;
  variants.hidden = false;
  if (comparison instanceof HTMLElement) comparison.hidden = true;
  figure.dataset.enhanced = "true";
  for (const item of /** @type {NodeListOf<HTMLLIElement>} */ (
    figure.querySelectorAll("li[data-stage-id]")
  )) {
    const button = item.querySelector("button");
    if (!button) continue;
    button.hidden = false;
    item.addEventListener("click", () => {
      stop();
      const stage = stages.find((stage) => stage.id === item.dataset.stageId);
      if (stage) show(stage.start, stage);
    });
  }
  range.addEventListener("input", () => {
    stop();
    show(Number(range.value));
  });
  playButton.addEventListener("click", () => {
    if (playing) stop();
    else start();
  });
  for (const button of /** @type {NodeListOf<HTMLButtonElement>} */ (
    figure.querySelectorAll("[data-figure-variant]")
  )) {
    button.addEventListener("click", () => {
      stop();
      figure.dataset.variant = button.dataset.figureVariant;
      comparisonOnly = button.dataset.comparisonOnly === "true";
      figure.dataset.comparisonOnly = String(comparisonOnly);
      controls.hidden = comparisonOnly;
      stageList.hidden = comparisonOnly;
      for (const choice of figure.querySelectorAll("[data-figure-variant]")) {
        choice.setAttribute("aria-pressed", String(choice === button));
      }
      show(Number(range.value));
    });
  }
  motion.addEventListener("change", stop);
  show(
    Number(range.value),
    stages.find((item) => item.id === figure.dataset.stage),
  );
}
