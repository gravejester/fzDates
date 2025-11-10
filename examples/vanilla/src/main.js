import './style.css';
import { createDateParser } from 'fzdates';

const parser = createDateParser();

const elements = {
  input: document.querySelector('#date-input'),
  ambiguityContainer: document.querySelector('#ambiguity-container'),
  ambiguitySelect: document.querySelector('#ambiguity-select'),
  selectedOutput: document.querySelector('#selected-output'),
  resultJson: document.querySelector('#result-json')
};

let lastResult = null;

function sanitizeForJson(value) {
  return JSON.parse(
    JSON.stringify(value, (_key, next) => {
      if (next instanceof Map) {
        return Object.fromEntries(next.entries());
      }
      if (next instanceof Set) {
        return Array.from(next.values());
      }
      if (typeof next === 'function') {
        return `[Function ${next.name || 'anonymous'}]`;
      }
      return next;
    })
  );
}

function renderResult(result) {
  lastResult = result;
  const safe = sanitizeForJson(result);
  elements.resultJson.textContent = JSON.stringify(safe, null, 2);
  const selectedDisplay = updateAmbiguityUI(result);
  updateSelectedOutput(result, selectedDisplay);
}

function updateAmbiguityUI(result) {
  if (!result || result.kind !== 'ambiguous' || !Array.isArray(result.candidates) || result.candidates.length === 0) {
    elements.ambiguityContainer.hidden = true;
    elements.ambiguitySelect.innerHTML = '';
    return result?.display ?? '';
  }

  elements.ambiguityContainer.hidden = false;
  elements.ambiguitySelect.innerHTML = '';

  result.candidates.forEach((candidate, index) => {
    const option = document.createElement('option');
    const label = formatCandidate(candidate, index);
    option.value = String(index);
    option.textContent = label;
    elements.ambiguitySelect.appendChild(option);
  });

  elements.ambiguitySelect.selectedIndex = 0;
  const firstCandidate = result.candidates[0];
  return firstCandidate?.display ?? firstCandidate?.normalized ?? '';
}

function updateSelectedOutput(result, overrideDisplay) {
  if (!result) {
    setStatusText('selectedOutput', 'Start typing to see results.', true);
    return;
  }

  if (result.kind === 'invalid') {
    const issues = Array.isArray(result.issues) && result.issues.length > 0
      ? ` Issues: ${result.issues.join(', ')}`
      : '';
    setStatusText('selectedOutput', `Invalid input.${issues}`, false);
    return;
  }

  if (result.kind === 'ambiguous') {
    const display = overrideDisplay || 'Select an interpretation from the dropdown.';
    setStatusText('selectedOutput', display, !overrideDisplay);
    return;
  }

  const display = overrideDisplay || result.display || '(no normalized display produced)';
  setStatusText('selectedOutput', display, !display);
}

function formatCandidate(candidate, index) {
  const label = candidate.display || candidate.normalized || candidate.meta?.order || `Option ${index + 1}`;
  if (candidate.meta?.order) {
    return `${label} (${candidate.meta.order})`;
  }
  return label;
}

function setStatusText(target, text, isEmpty) {
  if (target === 'selectedOutput') {
    elements.selectedOutput.textContent = text;
    elements.selectedOutput.classList.toggle('empty-state', Boolean(isEmpty));
  }
}

function clearViews() {
  elements.resultJson.textContent = '{ }';
  setStatusText('selectedOutput', 'Start typing to see results.', true);
  elements.ambiguityContainer.hidden = true;
  elements.ambiguitySelect.innerHTML = '';
  lastResult = null;
}

function handleInput(event) {
  const value = event.target.value;
  if (!value.trim()) {
    clearViews();
    return;
  }

  try {
    const result = parser.parse(value);
    renderResult(result);
  } catch (error) {
    setStatusText('selectedOutput', `Parser threw an error: ${error.message}`, false);
    elements.resultJson.textContent = JSON.stringify({ error: error.message }, null, 2);
    console.error('fzDates parser error', error);
  }
}

function handleAmbiguityChange(event) {
  if (!lastResult || lastResult.kind !== 'ambiguous') {
    return;
  }

  const selectedIndex = Number.parseInt(event.target.value, 10);
  const candidate = lastResult.candidates[selectedIndex];
  if (!candidate) {
    return;
  }

  const display = candidate.display || candidate.normalized || '';
  setStatusText('selectedOutput', display, !display);
}

if (elements.input) {
  elements.input.addEventListener('input', handleInput);
  elements.input.addEventListener('change', handleInput);
  elements.input.focus();
}

elements.ambiguitySelect.addEventListener('change', handleAmbiguityChange);

clearViews();
