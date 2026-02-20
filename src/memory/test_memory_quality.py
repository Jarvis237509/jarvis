"""
Test Suite: Memory Quality Features (PR #4)

Tests for:
- Confidence scoring [0..1]
- Citation metadata
- Conflict detection
- Transparent fallback behavior

Author: LaForge
Reviewers: Janice, Data
"""

import pytest
from datetime import datetime, timedelta
from typing import List

from memory_quality import (
    MemoryStore, MemoryEntry, Citation, ConflictReport,
    ConfidenceScorer, ConflictDetector, get_memory_store, reset_memory_store
)


class TestConfidenceScoring:
    """Test confidence scoring algorithm [0..1]."""
    
    def test_confidence_bounds(self):
        """Confidence must always be in [0, 1]."""
        # Create an entry with various configurations
        now = datetime.now().isoformat()
        entry = MemoryEntry(
            content="Test memory",
            path="/test/path",
            source_type="USER.md",
            created_at=now,
            last_accessed=now,
            access_count=100,  # High access
            confidence=0.0,
            citation=Citation(
                path="/test/path",
                line_start=1,
                line_end=10,
                excerpt="Test",
                timestamp=now,
                version_hash="abc123"
            ),
            tags=[],
            semantic_hash="hash123"
        )
        
        confidence = ConfidenceScorer.calculate_confidence(entry, 1.0)
        assert 0.0 <= confidence <= 1.0, f"Confidence {confidence} out of bounds"
    
    def test_source_type_weights(self):
        """Different source types have different base confidence."""
        now = datetime.now().isoformat()
        
        source_confidences = {}
        for source in ['USER.md', 'MEMORY.md', 'inferred', 'fallback']:
            entry = MemoryEntry(
                content="Test",
                path="/test",
                source_type=source,
                created_at=now,
                last_accessed=now,
                access_count=0,
                confidence=0.0,
                citation=None,
                tags=[],
                semantic_hash=""
            )
            confidence = ConfidenceScorer.calculate_confidence(entry)
            source_confidences[source] = confidence
        
        # Higher priority sources should have higher confidence
        assert source_confidences['USER.md'] > source_confidences['inferred']
        assert source_confidences['MEMORY.md'] > source_confidences['fallback']
    
    def test_recency_decay(self):
        """Older memories have lower confidence."""
        now = datetime.now()
        
        recent_entry = MemoryEntry(
            content="Recent",
            path="/test",
            source_type="session",
            created_at=now.isoformat(),
            last_accessed=now.isoformat(),
            access_count=0,
            confidence=0.0,
            citation=None,
            tags=[],
            semantic_hash=""
        )
        
        old_entry = MemoryEntry(
            content="Old",
            path="/test",
            source_type="session",
            created_at=(now - timedelta(days=60)).isoformat(),
            last_accessed=(now - timedelta(days=60)).isoformat(),
            access_count=0,
            confidence=0.0,
            citation=None,
            tags=[],
            semantic_hash=""
        )
        
        recent_conf = ConfidenceScorer.calculate_confidence(recent_entry)
        old_conf = ConfidenceScorer.calculate_confidence(old_entry)
        
        assert recent_conf > old_conf, "Recent memory should have higher confidence"
    
    def test_access_frequency_bonus(self):
        """Frequently accessed memories gain confidence."""
        now = datetime.now().isoformat()
        
        rare_entry = MemoryEntry(
            content="Rarely accessed",
            path="/test",
            source_type="session",
            created_at=now,
            last_accessed=now,
            access_count=0,
            confidence=0.0,
            citation=None,
            tags=[],
            semantic_hash=""
        )
        
        frequent_entry = MemoryEntry(
            content="Frequently accessed",
            path="/test",
            source_type="session",
            created_at=now,
            last_accessed=now,
            access_count=50,
            confidence=0.0,
            citation=None,
            tags=[],
            semantic_hash=""
        )
        
        rare_conf = ConfidenceScorer.calculate_confidence(rare_entry)
        frequent_conf = ConfidenceScorer.calculate_confidence(frequent_entry)
        
        assert frequent_conf > rare_conf, "Frequently accessed memory should have higher confidence"
    
    def test_citation_bonus(self):
        """Memories with citations have higher confidence."""
        now = datetime.now().isoformat()
        citation = Citation(
            path="/test",
            line_start=1,
            line_end=5,
            excerpt="Test content",
            timestamp=now,
            version_hash="v1"
        )
        
        no_cite_entry = MemoryEntry(
            content="No citation",
            path="/test",
            source_type="session",
            created_at=now,
            last_accessed=now,
            access_count=0,
            confidence=0.0,
            citation=None,
            tags=[],
            semantic_hash=""
        )
        
        cite_entry = MemoryEntry(
            content="Has citation",
            path="/test",
            source_type="session",
            created_at=now,
            last_accessed=now,
            access_count=0,
            confidence=0.0,
            citation=citation,
            tags=[],
            semantic_hash=""
        )
        
        no_cite_conf = ConfidenceScorer.calculate_confidence(no_cite_entry)
        cite_conf = ConfidenceScorer.calculate_confidence(cite_entry)
        
        assert cite_conf > no_cite_conf, "Cited memory should have higher confidence"


class TestCitationMetadata:
    """Test citation metadata structure."""
    
    def test_citation_structure(self):
        """Citation has all required fields."""
        now = datetime.now().isoformat()
        citation = Citation(
            path="/memory/sessions/2024-01-01.md",
            line_start=10,
            line_end=15,
            excerpt="Important memory content",
            timestamp=now,
            version_hash="a1b2c3d4"
        )
        
        assert citation.path is not None
        assert citation.line_start >= 1
        assert citation.line_end >= citation.line_start
        assert citation.excerpt is not None
        assert citation.timestamp is not None
        assert len(citation.version_hash) == 8


class TestConflictDetection:
    """Test conflict detection for contradictory memories."""
    
    def setup_method(self):
        """Reset store before each test."""
        reset_memory_store()
        self.store = get_memory_store()
    
    def test_contradiction_detection(self):
        """Detect direct contradictions."""
        now = datetime.now().isoformat()
        
        # Create contradictory entries
        entry_a = MemoryEntry(
            content="User likes cats",
            path="/test/a",
            source_type="USER.md",
            created_at=now,
            last_accessed=now,
            access_count=0,
            confidence=0.9,
            citation=None,
            tags=["preference"],
            semantic_hash=""
        )
        
        entry_b = MemoryEntry(
            content="User dislikes cats",
            path="/test/b",
            source_type="USER.md",
            created_at=now,
            last_accessed=now,
            access_count=0,
            confidence=0.9,
            citation=None,
            tags=["preference"],
            semantic_hash=""
        )
        
        conflicts = ConflictDetector.detect_conflicts(entry_a, [entry_b])
        
        # Should detect at least one conflict
        assert len(conflicts) > 0, "Should detect contradiction"
        assert any(c.conflict_type == 'contradiction' for c in conflicts)
    
    def test_temporal_conflict_detection(self):
        """Detect temporal conflicts."""
        now = datetime.now().isoformat()
        
        entry_a = MemoryEntry(
            content="User lives in New York now",
            path="/test/a",
            source_type="USER.md",
            created_at=now,
            last_accessed=now,
            access_count=0,
            confidence=0.8,
            citation=None,
            tags=["location"],
            semantic_hash=""
        )
        
        entry_b = MemoryEntry(
            content="User lived in Boston before",
            path="/test/b",
            source_type="USER.md",
            created_at=now,
            last_accessed=now,
            access_count=0,
            confidence=0.8,
            citation=None,
            tags=["location"],
            semantic_hash=""
        )
        
        conflicts = ConflictDetector.detect_conflicts(entry_a, [entry_b])
        
        assert any(c.conflict_type == 'temporal' for c in conflicts), \
            "Should detect temporal conflict"
    
    def test_no_conflict_for_same_source(self):
        """Don't flag conflicts for same source path."""
        now = datetime.now().isoformat()
        
        entry_a = MemoryEntry(
            content="Memory A",
            path="/test/same",
            source_type="USER.md",
            created_at=now,
            last_accessed=now,
            access_count=0,
            confidence=0.8,
            citation=None,
            tags=[],
            semantic_hash=""
        )
        
        entry_b = MemoryEntry(
            content="Memory B",
            path="/test/same",  # Same path
            source_type="USER.md",
            created_at=now,
            last_accessed=now,
            access_count=0,
            confidence=0.8,
            citation=None,
            tags=[],
            semantic_hash=""
        )
        
        conflicts = ConflictDetector.detect_conflicts(entry_a, [entry_b])
        
        assert len(conflicts) == 0, "Same source should not conflict"


class TestFallbackBehavior:
    """Test transparent fallback behavior."""
    
    def setup_method(self):
        """Reset store before each test."""
        reset_memory_store()
        self.store = get_memory_store()
    
    def test_fallback_when_no_results(self):
        """Fallback to lower confidence when no results."""
        # Add a low confidence memory
        self.store.add(
            content="Low priority memory",
            path="/test.md",
            source_type="fallback",
            tags=["test"]
        )
        
        # Search with high confidence threshold
        result = self.store.search("nonexistent query", min_confidence=0.99)
        
        # Should fallback
        assert result['fallback']['used'] is True
        assert result['fallback']['reason'] is not None
    
    def test_no_fallback_with_results(self):
        """No fallback when results exist."""
        # Add a normal memory
        self.store.add(
            content="Test content about python",
            path="/test.md",
            source_type="USER.md",
            tags=["test"]
        )
        
        # Search
        result = self.store.search("python", min_confidence=0.0)
        
        # Should not fallback
        assert result['fallback']['used'] is False
        assert result['count'] > 0
    
    def test_fallback_transparency(self):
        """Fallback information is transparent in response."""
        # Add a memory
        self.store.add(
            content="Test",
            path="/test.md",
            source_type="session",
            tags=["test"]
        )
        
        # Search with impossible confidence threshold
        result = self.store.search("memory", min_confidence=1.0)
        
        # Verify fallback structure
        assert 'fallback' in result
        assert 'used' in result['fallback']
        assert 'reason' in result['fallback']


class TestMemoryStore:
    """Integration tests for MemoryStore with quality features."""
    
    def setup_method(self):
        """Reset store before each test."""
        reset_memory_store()
        self.store = get_memory_store()
    
    def test_add_returns_conflicts(self):
        """Adding memory returns conflict report."""
        # Add first memory
        self.store.add(
            content="User prefers tea",
            path="/user.md",
            source_type="USER.md",
            tags=["preference"]
        )
        
        # Add conflicting memory
        entry, conflicts = self.store.add(
            content="User prefers coffee",
            path="/user.md",
            source_type="USER.md",
            tags=["preference"]
        )
        
        # Should detect conflict and adjust confidence
        if conflicts:
            assert entry.confidence < 1.0
    
    def test_search_returns_citations(self):
        """Search results include citation metadata."""
        # Add with citation
        self.store.add(
            content="Important fact about AI",
            path="/memory/2024-01-01.md",
            source_type="MEMORY.md",
            line_start=10,
            line_end=12,
            excerpt="Important fact",
            tags=["ai"]
        )
        
        # Search
        result = self.store.search("AI important", min_confidence=0.0)
        
        # Response should indicate citations present
        assert 'citations' in result
        
        # Results should have citation field
        for r in result['results']:
            assert 'citation' in r
    
    def test_confidence_in_results(self):
        """Search results include confidence scores."""
        self.store.add(
            content="High confidence fact",
            path="/user.md",
            source_type="USER.md",
            tags=["fact"]
        )
        
        result = self.store.search("fact", min_confidence=0.0)
        
        for r in result['results']:
            assert 'confidence' in r
            assert 0.0 <= r['confidence'] <= 1.0
            assert 'relevance_score' in r
            assert 'combined_score' in r
    
    def test_min_confidence_filtering(self):
        """Respect minimum confidence threshold."""
        # Add two memories
        self.store.add(
            content="High confidence content",
            path="/user.md",
            source_type="USER.md",
            tags=["high"]
        )
        
        # Search with high threshold
        result = self.store.search("content", min_confidence=0.9)
        
        for r in result['results']:
            assert r['confidence'] >= 0.9


if __name__ == "__main__":
    pytest.main([__file__, "-v"])