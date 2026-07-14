(function () {
  const { format } = window.DateFnsLite;
  const { ContractType, ServiceStatus, calculate, formatDurationParts, getCombatExplanationLabels } = window.DeferralCalculator;


const section = document.querySelector(".form-block");
const summary = document.getElementById("calc-validation");
const listEl = document.getElementById("calc-validation-list");
const formActions = document.getElementById("form-actions-anchor");

const combatDaysField = document.getElementById("field-combat-days");
const combatAssignmentField = document.getElementById("field-combat-assignment");
const combatAssignmentGrid = document.getElementById("combat-assignment-grid");
const combatOptionNoneLabel = document.getElementById("combat-option-none-label");
const combatOptionFirstLine = document.getElementById("combat-option-first-line");
const combatOptionNotFirstLine = document.getElementById("combat-option-not-first-line");
const combatDaysInput = document.getElementById("combat-days-input");
const serviceStartField = document.getElementById("field-service-start");
const serviceDatesRow = document.getElementById("field-service-dates");
const serviceEndField = document.getElementById("field-service-end");
const contractStartLabel = document.getElementById("contract-start-label");
const serviceStartInput = document.getElementById("service-start-date");
const serviceEndInput = document.getElementById("service-end-date");

const sidebarHint = document.getElementById("sidebar-hint");
const sidebarResults = document.getElementById("sidebar-results");
const sidebarExplanation = document.getElementById("sidebar-explanation");
const sidebarMobileValue = document.getElementById("sidebar-mobile-value");

const SERVICE_AFTER_CONTRACT_ERROR =
  "Дата початку військової служби не може бути пізнішою за планову або фактичну дату підписання нового контракту";

const DISCHARGE_BEFORE_START_ERROR =
  "Дата звільнення з військової служби має бути пізнішою за дату початку служби";

const DISCHARGE_AFTER_CONTRACT_ERROR =
  "Дата звільнення з військової служби має бути ранішою за планову або фактичну дату підписання нового контракту";

const COMBAT_EXPLANATION_LABELS = getCombatExplanationLabels();

const summaryTitle = summary
  ? summary.querySelector(".form-validation-summary__title")
  : null;

function parseDateInput(id) {
  const el = document.getElementById(id);
  if (!el || !el.value) return null;
  const [year, month, day] = el.value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function parseIntegerInput(id) {
  const el = document.getElementById(id);
  if (!el) return 0;
  const value = el.value.trim();
  if (!value) return 0;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? NaN : parsed;
}

const CombatAssignment = {
  NONE: "NONE",
  FIRST_LINE: "FIRST_LINE",
  NOT_FIRST_LINE: "NOT_FIRST_LINE",
};

function getSelectedContractType() {
  const selected = document.querySelector('input[name="contractType"]:checked');
  return selected ? selected.value : null;
}

function getSelectedServiceStatus() {
  const selected = document.querySelector('input[name="serviceStatus"]:checked');
  return selected ? selected.value : null;
}

function getSelectedCombatAssignment() {
  const selected = document.querySelector('input[name="combatAssignment"]:checked');
  return selected ? selected.value : null;
}

function showsCombatAssignment(type) {
  return type === ContractType.COMBAT || type === ContractType.BASIC;
}

function requiresCombatDaysInput(assignment) {
  return (
    assignment === CombatAssignment.FIRST_LINE ||
    assignment === CombatAssignment.NOT_FIRST_LINE
  );
}

function requiresCombatDaysField(type, assignment) {
  return type === ContractType.ASSAULT || requiresCombatDaysInput(assignment);
}

function clearCombatAssignmentSelection() {
  document.querySelectorAll('input[name="combatAssignment"]').forEach(function (input) {
    input.checked = false;
  });
}

function resetCombatDaysInput() {
  if (combatDaysInput) {
    combatDaysInput.value = "0";
  }
}

function requiresServiceStartDate(status) {
  return status === ServiceStatus.ACTIVE || status === ServiceStatus.DISCHARGED;
}

function requiresServiceEndDate(status) {
  return status === ServiceStatus.DISCHARGED;
}

function syncStatusFields() {
  const status = getSelectedServiceStatus();
  const showServiceStart = requiresServiceStartDate(status);
  const showServiceEnd = requiresServiceEndDate(status);

  if (serviceDatesRow) {
    serviceDatesRow.hidden = !showServiceStart;
    serviceDatesRow.classList.toggle(
      "service-dates-row--single",
      showServiceStart && !showServiceEnd
    );
  }

  if (serviceEndField) {
    serviceEndField.hidden = !showServiceEnd;
  }

  if (contractStartLabel) {
    contractStartLabel.textContent =
      status === ServiceStatus.OBLIGATED
        ? "Планова дата підписання нового контракту"
        : "Планова або фактична дата підписання нового контракту";
  }

  if (!showServiceStart && serviceStartInput) {
    serviceStartInput.value = "";
    syncDateFieldState(serviceStartInput);
  }

  if (!showServiceEnd && serviceEndInput) {
    serviceEndInput.value = "";
    syncDateFieldState(serviceEndInput);
  }
}

function syncCombatFields() {
  const type = getSelectedContractType();
  const assignment = getSelectedCombatAssignment();

  if (combatAssignmentField) {
    combatAssignmentField.hidden = !showsCombatAssignment(type);
  }

  if (type === ContractType.COMBAT) {
    if (combatAssignmentGrid) {
      combatAssignmentGrid.setAttribute("data-layout", "combat");
    }
    if (combatOptionFirstLine) {
      combatOptionFirstLine.hidden = false;
    }
  } else if (type === ContractType.BASIC) {
    if (combatAssignmentGrid) {
      combatAssignmentGrid.setAttribute("data-layout", "basic");
    }
    if (combatOptionFirstLine) {
      combatOptionFirstLine.hidden = true;
    }
    if (assignment === CombatAssignment.FIRST_LINE) {
      clearCombatAssignmentSelection();
    }
  }

  if (combatOptionNoneLabel) {
    combatOptionNoneLabel.textContent =
      type === ContractType.BASIC ? "Без бойових" : "Без бойових завдань";
  }

  const showCombatDays = requiresCombatDaysField(type, assignment);
  if (combatDaysField) {
    combatDaysField.hidden = !showCombatDays;
  }
  if (!showCombatDays) {
    resetCombatDaysInput();
  }
}

function collectMissing() {
  const missing = [];
  const serviceStatus = getSelectedServiceStatus();
  const contractType = getSelectedContractType();

  if (!serviceStatus) {
    missing.push({
      id: "field-service-status",
      label: "Статус",
      focusSelector: 'input[name="serviceStatus"]',
    });
  }

  if (requiresServiceStartDate(serviceStatus) && !parseDateInput("service-start-date")) {
    missing.push({
      id: "field-service-start",
      label: "Дата початку військової служби",
      focusSelector: "#service-start-date",
    });
  }

  if (requiresServiceEndDate(serviceStatus) && !parseDateInput("service-end-date")) {
    missing.push({
      id: "field-service-end",
      label: "Дата звільнення з військової служби",
      focusSelector: "#service-end-date",
    });
  }

  if (!contractType) {
    missing.push({
      id: "field-contract-type",
      label: "Тип контракту",
      focusSelector: 'input[name="contractType"]',
    });
  }

  if (!parseDateInput("contract-start-date")) {
    missing.push({
      id: "field-contract-start",
      label: "Дата підписання нового контракту",
      focusSelector: "#contract-start-date",
    });
  }

  if (contractType && showsCombatAssignment(contractType) && !getSelectedCombatAssignment()) {
    missing.push({
      id: "field-combat-assignment",
      label: "Бойові завдання",
      focusSelector: 'input[name="combatAssignment"]',
    });
  } else if (requiresCombatDaysField(contractType, getSelectedCombatAssignment())) {
    const combatDays = parseIntegerInput("combat-days-input");
    if (!Number.isInteger(combatDays) || combatDays < 0) {
      missing.push({
        id: "field-combat-days",
        label: "Кількість днів виконання бойових завдань",
        focusSelector: "#combat-days-input",
      });
    }
  }

  return missing;
}

function collectDateOrderError() {
  const serviceStatus = getSelectedServiceStatus();
  if (!requiresServiceStartDate(serviceStatus)) {
    return [];
  }

  const serviceStartDate = parseDateInput("service-start-date");
  const serviceEndDate = parseDateInput("service-end-date");
  const contractStartDate = parseDateInput("contract-start-date");

  if (
    serviceStartDate &&
    contractStartDate &&
    serviceStartDate.getTime() > contractStartDate.getTime()
  ) {
    return [
      {
        id: "field-service-start",
        label: SERVICE_AFTER_CONTRACT_ERROR,
        focusSelector: "#service-start-date",
        invalidIds: ["field-service-start", "field-contract-start"],
        kind: "date-order",
      },
    ];
  }

  if (requiresServiceEndDate(serviceStatus)) {
    if (
      serviceStartDate &&
      serviceEndDate &&
      serviceEndDate.getTime() <= serviceStartDate.getTime()
    ) {
      return [
        {
          id: "field-service-end",
          label: DISCHARGE_BEFORE_START_ERROR,
          focusSelector: "#service-end-date",
          invalidIds: ["field-service-start", "field-service-end"],
          kind: "date-order",
        },
      ];
    }

    if (
      serviceEndDate &&
      contractStartDate &&
      serviceEndDate.getTime() >= contractStartDate.getTime()
    ) {
      return [
        {
          id: "field-service-end",
          label: DISCHARGE_AFTER_CONTRACT_ERROR,
          focusSelector: "#service-end-date",
          invalidIds: ["field-service-end", "field-contract-start"],
          kind: "date-order",
        },
      ];
    }
  }

  return [];
}

function clearValidationSummary() {
  if (summary) summary.hidden = true;
  if (listEl) listEl.replaceChildren();
  parkSummary();
}

function syncDateFieldState(input) {
  if (!input) return;
  input.classList.toggle("is-empty", !input.value);
}

function openDatePicker(input) {
  if (!input) return;

  if (typeof input.showPicker === "function") {
    try {
      input.showPicker();
      return;
    } catch (error) {
      // Browser blocked showPicker without user gesture — fall back to focus.
    }
  }

  input.focus();
}

function initDateFields() {
  section.querySelectorAll(".date-field").forEach(function (field) {
    const input = field.querySelector(".date-input");
    const trigger = field.querySelector(".date-field__trigger");
    if (!input) return;

    syncDateFieldState(input);
    input.addEventListener("input", function () {
      syncDateFieldState(input);
    });
    input.addEventListener("change", function () {
      syncDateFieldState(input);
    });
    input.addEventListener("click", function () {
      openDatePicker(input);
    });

    if (trigger) {
      trigger.addEventListener("click", function () {
        openDatePicker(input);
      });
    }
  });
}

if (!section) {
  throw new Error("Deferral calculator markup is missing");
}

function parkSummary() {
  if (formActions && summary) {
    section.insertBefore(summary, formActions);
  }
}

function mountSummaryBeforeFirst(missing) {
  if (!missing.length || !summary) return;
  const anchor = document.getElementById(missing[0].id);
  if (!anchor || anchor.parentNode !== section) return;
  section.insertBefore(summary, anchor);
}

function clearStepInvalid() {
  section.querySelectorAll(".is-step-invalid").forEach(function (el) {
    el.classList.remove("is-step-invalid");
  });
}

function applyStepInvalid(items) {
  items.forEach(function (item) {
    const ids = item.invalidIds || [item.id];
    ids.forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.classList.add("is-step-invalid");
    });
  });
}

function updateValidationSummary(items) {
  if (!summaryTitle) return;

  const hasDateOrderError = items.some(function (item) {
    return item.kind === "date-order";
  });

  summaryTitle.textContent = hasDateOrderError
    ? "Перевірте введені дані:"
    : "Щоб розрахувати відстрочку, заповніть поля:";
}

function hideResults() {
  document.body.classList.remove("sidebar-preview-ready");
  if (sidebarHint) sidebarHint.hidden = false;
  if (sidebarResults) sidebarResults.hidden = true;
  window.dispatchEvent(new CustomEvent("sidebarpreviewchange"));
}

function showValidation(items) {
  applyStepInvalid(items);
  renderList(items);
  mountSummaryBeforeFirst(items);
  updateValidationSummary(items);
  if (summary) summary.hidden = false;
  hideResults();
}

function renderList(missing) {
  if (!listEl) return;
  listEl.replaceChildren();

  missing.forEach(function (item) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = "#" + item.id;
    a.textContent = item.label;
    a.addEventListener("click", function (e) {
      e.preventDefault();
      scrollAndFocusMissing([item]);
    });
    li.appendChild(a);
    listEl.appendChild(li);
  });
}

function resolveFocusTarget(holder, focusSelector) {
  if (!holder) return null;
  if (focusSelector.charAt(0) === "#") {
    return document.querySelector(focusSelector);
  }
  return holder.querySelector(focusSelector);
}

function scrollAndFocusMissing(missing) {
  if (!missing.length) return;
  const first = missing[0];
  const holder = document.getElementById(first.id);
  if (!holder) return;

  holder.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });

  let target = resolveFocusTarget(holder, first.focusSelector);
  if (!target) {
    target = holder.querySelector("input, select, textarea, button");
  }

  if (target) {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        target.focus({ preventScroll: true });
      });
    });
  }
}

function formatDisplayDate(date) {
  return format(date, "dd.MM.yyyy");
}

function appendExplanationSummaryRow(container, label, value) {
  const row = document.createElement("div");
  row.className = "explanation-line explanation-line--total explanation-line--summary-row";

  const head = document.createElement("div");
  head.className = "explanation-line__head";

  const labelEl = document.createElement("p");
  labelEl.className = "explanation-line__value";
  labelEl.textContent = label;

  const valueEl = document.createElement("p");
  valueEl.className = "explanation-line__value";
  valueEl.textContent = value;

  head.appendChild(labelEl);
  head.appendChild(valueEl);
  row.appendChild(head);
  container.appendChild(row);
}

function formatExplanationLabel(line) {
  const labelsWithDetailInParens = [
    ...COMBAT_EXPLANATION_LABELS,
    "Повні роки служби до 24.02.2022",
    "Повні роки служби з 24.02.2022 до підписання контракту",
    "Повні роки служби з 24.02.2022 до дати звільнення",
  ];

  if (line.detail && labelsWithDetailInParens.includes(line.label)) {
    return line.label + " (" + line.detail + "):";
  }

  return line.label + ":";
}

function isCombatExplanationLine(label) {
  return COMBAT_EXPLANATION_LABELS.includes(label);
}

function renderExplanation(result) {
  if (!sidebarExplanation) return;

  sidebarExplanation.replaceChildren();

  result.explanation.forEach(function (line, index) {
    const row = document.createElement("div");
    row.className = "explanation-line";
    const isYearsBeforeLine = line.label === "Повні роки служби до 24.02.2022";
    const isYearsAfterLine =
      line.label === "Повні роки служби з 24.02.2022 до підписання контракту" ||
      line.label === "Повні роки служби з 24.02.2022 до дати звільнення";
    const isCombatLine = isCombatExplanationLine(line.label);
    const isInlineHeadRow =
      index === 0 || isYearsBeforeLine || isYearsAfterLine || isCombatLine;
    const usesDetailInLabel = isYearsBeforeLine || isYearsAfterLine || isCombatLine;

    if (isYearsBeforeLine) row.classList.add("explanation-line--years-before");
    if (isYearsAfterLine) row.classList.add("explanation-line--years-after");
    if (isCombatLine) row.classList.add("explanation-line--combat");

    if (isInlineHeadRow) {
      if (index === 0) {
        row.classList.add("explanation-line--summary-row");
      }

      const label = document.createElement("p");
      label.className = "explanation-line__label";
      label.textContent = formatExplanationLabel(line);

      const value = document.createElement("p");
      value.className = "explanation-line__value";
      value.textContent = line.contribution;

      const head = document.createElement("div");
      head.className = "explanation-line__head";
      head.appendChild(label);
      head.appendChild(value);
      row.appendChild(head);

      if (line.detail && !usesDetailInLabel) {
        const detail = document.createElement("p");
        detail.className = "explanation-line__detail";
        detail.textContent = line.detail;
        row.appendChild(detail);
      }
    } else {
      const label = document.createElement("p");
      label.className = "explanation-line__label";
      label.textContent = line.label + ":";
      row.appendChild(label);

      if (line.detail) {
        const detail = document.createElement("p");
        detail.className = "explanation-line__detail";
        detail.textContent = line.detail;
        row.appendChild(detail);
      }

      const value = document.createElement("p");
      value.className = "explanation-line__value";
      value.textContent = line.contribution;
      row.appendChild(value);
    }

    sidebarExplanation.appendChild(row);
  });

  const ruleBefore = document.createElement("div");
  ruleBefore.className = "explanation-line__rule";
  ruleBefore.setAttribute("role", "presentation");
  sidebarExplanation.appendChild(ruleBefore);

  appendExplanationSummaryRow(
    sidebarExplanation,
    "Загалом відстрочки:",
    result.deferralDurationLabel
  );
  appendExplanationSummaryRow(
    sidebarExplanation,
    "Контракт завершується:",
    formatDisplayDate(result.contractEndDate)
  );
  appendExplanationSummaryRow(
    sidebarExplanation,
    "Відстрочка діє до:",
    formatDisplayDate(result.deferralEndDate)
  );
}

function showResults(result) {
  const durationLabel = formatDurationParts(result.deferralDuration);

  if (sidebarHint) sidebarHint.hidden = true;
  if (sidebarResults) sidebarResults.hidden = false;
  if (sidebarMobileValue) sidebarMobileValue.textContent = durationLabel;

  renderExplanation(result);

  document.body.classList.add("sidebar-preview-ready");
  window.dispatchEvent(new CustomEvent("sidebarpreviewchange"));
}

function bindStepper(inputId, decId, incId, min) {
  const input = document.getElementById(inputId);
  const dec = document.getElementById(decId);
  const inc = document.getElementById(incId);

  if (!input || !dec || !inc) return;

  function readValue() {
    const parsed = Number.parseInt(input.value, 10);
    return Number.isNaN(parsed) ? min : parsed;
  }

  function writeValue(value) {
    input.value = String(Math.max(min, value));
    syncValidationOnChange();
    runCalculation();
  }

  dec.addEventListener("click", function () {
    writeValue(readValue() - 1);
  });

  inc.addEventListener("click", function () {
    writeValue(readValue() + 1);
  });

  input.addEventListener("input", function () {
    syncValidationOnChange();
    runCalculation();
  });
}

function buildInput() {
  const serviceStatus = getSelectedServiceStatus();
  const contractType = getSelectedContractType();
  const serviceStartDate = parseDateInput("service-start-date");
  const serviceEndDate = parseDateInput("service-end-date");
  const contractStartDate = parseDateInput("contract-start-date");

  if (!serviceStatus || !contractType || !contractStartDate) {
    return null;
  }

  if (requiresServiceStartDate(serviceStatus) && !serviceStartDate) {
    return null;
  }

  if (requiresServiceEndDate(serviceStatus) && !serviceEndDate) {
    return null;
  }

  const input = {
    serviceStatus,
    contractType,
    contractStartDate,
  };

  if (requiresServiceStartDate(serviceStatus)) {
    input.serviceStartDate = serviceStartDate;
  }

  if (requiresServiceEndDate(serviceStatus)) {
    input.serviceEndDate = serviceEndDate;
  }

  if (showsCombatAssignment(contractType)) {
    input.combatAssignment = getSelectedCombatAssignment();
  }

  if (requiresCombatDaysField(contractType, getSelectedCombatAssignment())) {
    input.combatDays = parseIntegerInput("combat-days-input");
  } else {
    input.combatDays = 0;
  }

  return input;
}

function showCalculatorError(error) {
  if (!(error instanceof Error) || !error.message) {
    hideResults();
    return;
  }

  const message = error.message;
  let item = {
    id: "field-contract-start",
    label: message,
    focusSelector: "#contract-start-date",
    kind: "date-order",
  };

  if (message.includes("звільнення")) {
    if (message.includes("початку")) {
      item = {
        id: "field-service-end",
        label: message,
        focusSelector: "#service-end-date",
        invalidIds: ["field-service-start", "field-service-end"],
        kind: "date-order",
      };
    } else {
      item = {
        id: "field-service-end",
        label: message,
        focusSelector: "#service-end-date",
        invalidIds: ["field-service-end", "field-contract-start"],
        kind: "date-order",
      };
    }
  } else if (message.includes("початку військової служби")) {
    item = {
      id: "field-service-start",
      label: message,
      focusSelector: "#service-start-date",
      invalidIds: ["field-service-start", "field-contract-start"],
      kind: "date-order",
    };
  }

  showValidation([item]);
}

function runCalculation() {
  const dateOrderError = collectDateOrderError();
  if (dateOrderError.length) {
    showValidation(dateOrderError);
    return;
  }

  clearValidationSummary();

  const missing = collectMissing();
  if (missing.length) {
    hideResults();
    return;
  }

  try {
    const result = calculate(buildInput());
    showResults(result);
  } catch (error) {
    showCalculatorError(error);
  }
}

function syncValidationOnChange() {
  clearStepInvalid();
  runCalculation();
}

section.addEventListener("change", function (e) {
  if (e.target && e.target.name === "serviceStatus") {
    syncStatusFields();
  }
  if (e.target && e.target.name === "contractType") {
    clearCombatAssignmentSelection();
    resetCombatDaysInput();
    syncCombatFields();
  }
  if (e.target && e.target.name === "combatAssignment") {
    syncCombatFields();
  }
  syncValidationOnChange();
});

section.addEventListener("input", syncValidationOnChange);

bindStepper("combat-days-input", "combat-days-dec", "combat-days-inc", 0);
syncStatusFields();
syncCombatFields();
initDateFields();

})();
