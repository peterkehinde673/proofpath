import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAnalysis } from '../server.mjs';

function sample(overrides = {}) {
  return {
    summary: 'The records show a purchase and a dispute about delivery.',
    events: [{
      id: 'event-1',
      date: '2026-06-18',
      event: 'Payment made',
      status: 'supported',
      evidence: [{ fileId: 'payment', excerpt: 'Amount: NGN 25,000', detail: 'The receipt records a payment of NGN 25,000.' }],
      why: 'The receipt directly records this payment.',
    }],
    fileIssues: [],
    missingEvidence: [],
    contradictions: [],
    ...overrides,
  };
}

const files = { submittedIds: ['payment', 'seller'], unavailableIds: [] };

test('accepts a supported event with direct evidence from a submitted file', () => {
  const result = validateAnalysis(sample(), files);
  assert.deepEqual(result.events[0].sourceIds, ['payment']);
  assert.match(result.events[0].details[0], /NGN 25,000/);
});

test('rejects a supported event with no evidence', () => {
  const analysis = sample({ events: [{ ...sample().events[0], evidence: [] }] });
  assert.throws(() => validateAnalysis(analysis, files), /must cite direct evidence/);
});

test('rejects citations to files the user did not submit', () => {
  const event = { ...sample().events[0], evidence: [{ ...sample().events[0].evidence[0], fileId: 'invented' }] };
  assert.throws(() => validateAnalysis(sample({ events: [event] }), files), /does not match readable submitted evidence/);
});

test('requires an uncertain event to have a relevant evidence source', () => {
  const event = { ...sample().events[0], status: 'uncertain', evidence: [] };
  assert.throws(() => validateAnalysis(sample({ events: [event] }), files), /must have a relevant source/);
});

test('requires a contradiction to cite two different files', () => {
  const analysis = sample({ contradictions: [{
    claim: 'Conflicting delivery status',
    evidence: [sample().events[0].evidence[0]],
    explanation: 'One source conflicts with another.',
  }] });
  assert.throws(() => validateAnalysis(analysis, files), /two different files/);
});

test('does not allow an event to cite a file marked unavailable', () => {
  const analysis = sample({ fileIssues: [{ fileId: 'payment', reason: 'Unreadable file' }] });
  assert.throws(() => validateAnalysis(analysis, files), /does not match readable submitted evidence/);
});

test('rejects an event with an invalid date instead of guessing one', () => {
  const event = { ...sample().events[0], date: 'June 18' };
  assert.throws(() => validateAnalysis(sample({ events: [event] }), files), /ISO format or empty/);
});
