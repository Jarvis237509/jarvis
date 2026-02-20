# Memory Quality Technical Implementation (PR #4)

**Author:** Geordi LaForge (Chief Engineer)
**Reviewers:** Janice, Data
**Status:** ✅ Complete — All 15 tests passing

---

## Overview

This implementation adds quality metadata to the OpenClaw memory system, enabling:
- **Confidence scoring** [0..1] for all memories
- **Structured citations** (path, line numbers, excerpts)
- **Conflict detection** for contradictory memories
- **Transparent fallback** behavior

---

## API Changes

### `memory_search` / `memory_get`

Both tools now return additional metadata fields:

```json
{
  "query": "user preference",
  "results": [
    {
      "content": "User prefers tea",
      "confidence": 0.9234,
      "relevance_score": 0.85,
      "combined_score": 0.7849,
      "citation": {
        "path": "memory/2024-01-01.md",
        "line_start": 10,
        "line_end": 12,
        "excerpt": "User prefers tea in the morning",
        "version_hash": "a1b2c3d4"
      },
      "source_type": "MEMORY.md"
    }
  ],
  "fallback": {
    "used": false,
    "reason": null
  },
  "citations": "auto"
}
```

### `min_confidence` Parameter

```python
result = store.search("query", min_confidence=0.8)
```

If no results meet the threshold, the system automatically falls back to `min_confidence=0` with a transparent notification in `fallback.used` and `fallback.reason`.

---

## Confidence Scoring Algorithm

Confidence is calculated as a weighted combination of factors:

```
confidence = (
    base_confidence(source_type) * 0.5 +
    recency_factor * 0.3 +
    access_frequency_bonus * 0.1 +
    citation_bonus * 0.1
) * relevance_multiplier
```

### Source Type Weights

| Source Type | Weight |
|-------------|--------|
| USER.md     | 1.0    |
| MEMORY.md   | 0.95   |
| AGENTS.md   | 0.90   |
| session     | 0.85   |
| heartbeat   | 0.70   |
| inferred    | 0.50   |
| fallback    | 0.40   |

### Recency Decay

- Confidence decays exponentially over time
- `recency_factor = exp(-days_old / 30)`
- After 30 days, confidence is ~37% of original
- After 60 days, confidence is ~14% of original

### Access Frequency Bonus

- `bonus = log1p(access_count) * 0.05`
- Capped at 0.10 maximum bonus
- Diminishing returns for repeated access

### Citation Bonus

- `+0.05` if citation is present
- Provides provenance tracking

---

## Conflict Detection

### Types of Conflicts

1. **Contradictions** — Direct negations (likes vs dislikes)
   - Penalty: -0.30 confidence
   - Resolution: manual_review

2. **Temporal** — Same topic, different time periods
   - Penalty: -0.15 confidence
   - Resolution: timestamp_priority

3. **Semantic** — High overlap but conflicting values
   - Penalty: -0.10 confidence
   - Resolution: merge_or_clarify

### Conflict Detection Patterns

```python
negation_words = ['not', 'dislike', 'hate', 'isn\'t', 'can\'t', ...]
positive_words = ['like', 'love', 'is', 'can', ...]

def detect_contradiction(a, b):
    if (has_negation(a) and has_positive(b)) or \
       (has_positive(a) and has_negation(b)):
        if share_meaningful_context(a, b):
            return ConflictReport(...)
```

---

## Usage Examples

### Adding Memory with Citation

```python
entry, conflicts = store.add(
    content="User's favorite color is blue",
    path="memory/2024-02-20.md",
    source_type="MEMORY.md",
    line_start=45,
    line_end=47,
    excerpt="User mentioned they love blue...",
    tags=["preference", "color"]
)

if conflicts:
    for c in conflicts:
        print(f"Conflict: {c.conflict_type}")
        print(f"Suggestion: {c.suggested_resolution}")
```

### Searching with Confidence Filter

```python
result = store.search(
    query="user preferences",
    min_confidence=0.7,
    max_results=5
)

if result['fallback']['used']:
    print("Warning: Low confidence results returned")

for item in result['results']:
    print(f"[{item['confidence']:.2f}] {item['content']}")
```

---

## Running Tests

### Using the standalone runner:

```bash
cd src/memory
python3 run_tests.py
```

### Using pytest:

```bash
cd src/memory
pytest test_memory_quality.py -v
```

### Expected Output:

```
============================================================
Memory Quality Test Suite (PR #4)
============================================================

Running: Confidence bounds [0..1]... ✓ PASSED
Running: Source type confidence weights... ✓ PASSED
Running: Recency decay affects confidence... ✓ PASSED
Running: Access frequency boost... ✓ PASSED
Running: Citation metadata bonus... ✓ PASSED
Running: Contradiction detection... ✓ PASSED
Running: Temporal conflict detection... ✓ PASSED
Running: Same source path - no conflict... ✓ PASSED
Running: Fallback when no results... ✓ PASSED
Running: No fallback with results... ✓ PASSED
Running: Fallback transparency... ✓ PASSED
Running: Add memory returns conflicts... ✓ PASSED
Running: Search with citations... ✓ PASSED
Running: Confidence in search results... ✓ PASSED
Running: Min confidence filtering... ✓ PASSED

============================================================
Results: 15 passed, 0 failed
============================================================
```

---

## Technical Notes

### Storage

- Index stored as JSON in `.memory_store/index.json`
- Semantic hashes for quick conflict detection
- Version hashes for citation integrity

### Performance

- O(n) conflict detection for new entries
- O(n) search with early termination
- Suitable for <10,000 memory entries

### Thread Safety

- Not thread-safe (single-threaded design)
- Suitable for OpenClaw's session-based model

---

## Future Enhancements

- [ ] Vector-based semantic similarity
- [ ] ML-based conflict classification
- [ ] Automatic resolution suggestions
- [ ] Cross-session memory merging

---

## Files

- `memory_quality.py` — Core implementation (~600 lines)
- `test_memory_quality.py` — Pytest-compatible test suite
- `run_tests.py` — Standalone test runner
- `README.md` — This documentation

---

*"Confidence is the key to reliable memory retrieval."* — Chief Engineer LaForge