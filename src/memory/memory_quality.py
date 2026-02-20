"""
Memory Quality System - OpenClaw Memory Backend

Technical implementation supporting:
- Confidence scoring [0..1]
- Citation metadata
- Conflict detection for contradictory memories
- Transparent fallback behavior

Author: Laforge (PR #4)
Reviewers: Janice, Data
"""

import json
import re
import hashlib
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from pathlib import Path
import math


@dataclass
class Citation:
    """Structured citation for memory sources."""
    path: str
    line_start: int
    line_end: int
    excerpt: str
    timestamp: str
    version_hash: str
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Citation':
        return cls(**data)


@dataclass
class MemoryEntry:
    """Single memory entry with quality metadata."""
    content: str
    path: str
    source_type: str  # 'USER.md', 'MEMORY.md', 'session', etc.
    created_at: str
    last_accessed: str
    access_count: int
    confidence: float  # [0..1]
    citation: Optional[Citation]
    tags: List[str]
    semantic_hash: str  # For conflict detection
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'content': self.content,
            'path': self.path,
            'source_type': self.source_type,
            'created_at': self.created_at,
            'last_accessed': self.last_accessed,
            'access_count': self.access_count,
            'confidence': self.confidence,
            'citation': self.citation.to_dict() if self.citation else None,
            'tags': self.tags,
            'semantic_hash': self.semantic_hash
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'MemoryEntry':
        citation = Citation.from_dict(data['citation']) if data.get('citation') else None
        return cls(
            content=data['content'],
            path=data['path'],
            source_type=data['source_type'],
            created_at=data['created_at'],
            last_accessed=data['last_accessed'],
            access_count=data['access_count'],
            confidence=data['confidence'],
            citation=citation,
            tags=data.get('tags', []),
            semantic_hash=data['semantic_hash']
        )


@dataclass
class ConflictReport:
    """Report of conflicting memories."""
    entry_a: MemoryEntry
    entry_b: MemoryEntry
    conflict_type: str  # 'contradiction', 'temporal', 'semantic'
    confidence_delta: float
    suggested_resolution: str
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'entry_a': self.entry_a.to_dict(),
            'entry_b': self.entry_b.to_dict(),
            'conflict_type': self.conflict_type,
            'confidence_delta': self.confidence_delta,
            'suggested_resolution': self.suggested_resolution
        }


class ConfidenceScorer:
    """Algorithm for calculating memory confidence scores [0..1]."""
    
    # Weight constants for confidence factors
    SOURCE_TYPE_WEIGHTS = {
        'USER.md': 1.0,
        'MEMORY.md': 0.95,
        'AGENTS.md': 0.90,
        'session': 0.85,
        'heartbeat': 0.70,
        'inferred': 0.50,
        'fallback': 0.40
    }
    
    RECENCY_DECAY_DAYS = 30  # Confidence decays over time
    ACCESS_BONUS_MAX = 0.10  # Max bonus from repeated access
    
    @classmethod
    def calculate_confidence(
        cls,
        entry: MemoryEntry,
        query_relevance: Optional[float] = None
    ) -> float:
        """
        Calculate confidence score [0..1] for a memory entry.
        
        Factors:
        - Source type reliability (0.4-1.0 base)
        - Recency (decay over time)
        - Access frequency (higher = more validated)
        - Query relevance (semantic match quality)
        
        Returns: Confidence score [0..1]
        """
        # Base confidence from source type
        base_confidence = cls.SOURCE_TYPE_WEIGHTS.get(
            entry.source_type, 0.50
        )
        
        # Recency factor: newer memories are more reliable
        try:
            created = datetime.fromisoformat(entry.created_at)
            days_old = (datetime.now() - created).days
            recency_factor = math.exp(-days_old / cls.RECENCY_DECAY_DAYS)
        except (ValueError, TypeError):
            recency_factor = 0.5  # Default if parsing fails
        
        # Access frequency bonus (diminishing returns)
        access_bonus = min(
            math.log1p(entry.access_count) * 0.05,
            cls.ACCESS_BONUS_MAX
        )
        
        # Citation bonus (having explicit source increases confidence)
        citation_bonus = 0.05 if entry.citation else 0.0
        
        # Query relevance factor (if provided)
        relevance_factor = query_relevance if query_relevance else 1.0
        
        # Calculate final confidence
        confidence = (
            base_confidence * 0.5 +
            recency_factor * 0.3 +
            access_bonus * 0.1 +
            citation_bonus * 0.1
        ) * relevance_factor
        
        return round(min(max(confidence, 0.0), 1.0), 4)
    
    @classmethod
    def adjust_for_conflicts(
        cls,
        entry: MemoryEntry,
        conflicts: List[ConflictReport]
    ) -> float:
        """
        Adjust confidence based on conflicts with other memories.
        
        Args:
            entry: The memory entry to adjust
            conflicts: List of conflicts involving this entry
            
        Returns:
            Adjusted confidence score [0..1]
        """
        if not conflicts:
            return entry.confidence
        
        # Reduce confidence based on number and severity of conflicts
        total_penalty = 0.0
        for conflict in conflicts:
            if conflict.conflict_type == 'contradiction':
                penalty = 0.3  # Heavy penalty for direct contradictions
            elif conflict.conflict_type == 'temporal':
                penalty = 0.15  # Medium penalty for temporal conflicts
            else:
                penalty = 0.1  # Light penalty for semantic conflicts
            
            # Reduce penalty if this entry has higher confidence
            if entry.confidence > conflict.entry_b.confidence:
                penalty *= 0.5
            
            total_penalty += penalty
        
        # Apply penalty (capped at 0.5 max reduction)
        penalty_cap = 0.5
        adjusted = entry.confidence - min(total_penalty, penalty_cap)
        
        return round(max(adjusted, 0.0), 4)


class ConflictDetector:
    """Detects conflicting or contradictory memories."""
    
    CONTRADICTION_PATTERNS = [
        # Pattern: negation flips (simplified without backref)
        (r'\b(is|are|was|were)\b', r'\b(not\s+(is|are|was|were)|isn\'t|aren\'t|wasn\'t|weren\'t)\b'),
        # Pattern: preference reversals
        (r'\b(like|love|prefer)\b', r'\b(dislike|hate|avoid)\b'),
        # Pattern: capability assertions
        (r'\b(can|able to)\b', r'\b(can\'t|cannot|unable to)\b'),
    ]
    
    @staticmethod
    def compute_semantic_hash(content: str) -> str:
        """Compute a hash for semantic comparison."""
        # Normalize content
        normalized = content.lower().strip()
        normalized = re.sub(r'[^\w\s]', '', normalized)
        normalized = re.sub(r'\s+', ' ', normalized)
        return hashlib.sha256(normalized.encode()).hexdigest()[:16]
    
    @classmethod
    def detect_conflicts(
        cls,
        new_entry: MemoryEntry,
        existing_entries: List[MemoryEntry],
        threshold: float = 0.7
    ) -> List[ConflictReport]:
        """
        Detect conflicts between new entry and existing memories.
        
        Args:
            new_entry: The new memory entry to check
            existing_entries: List of existing memories to compare against
            threshold: Similarity threshold for conflict detection [0..1]
            
        Returns:
            List of detected conflicts
        """
        conflicts = []
        
        for existing in existing_entries:
            # Skip if same path (same source)
            if new_entry.path == existing.path:
                continue
            
            # Check for contradictions
            contradiction = cls._check_contradiction(new_entry, existing)
            if contradiction:
                conflicts.append(contradiction)
                continue
            
            # Check for temporal conflicts
            temporal = cls._check_temporal_conflict(new_entry, existing)
            if temporal:
                conflicts.append(temporal)
                continue
            
            # Check for semantic conflicts (same topic, different values)
            semantic = cls._check_semantic_conflict(new_entry, existing, threshold)
            if semantic:
                conflicts.append(semantic)
        
        return conflicts
    
    @classmethod
    def _check_contradiction(
        cls,
        entry_a: MemoryEntry,
        entry_b: MemoryEntry
    ) -> Optional[ConflictReport]:
        """Check for direct contradictions between entries."""
        a_content = entry_a.content.lower()
        b_content = entry_b.content.lower()
        
        # Simple negation detection
        negation_words = ['not', 'dislike', 'hate', 'avoid', "isn't", "aren't", "wasn't", "weren't", "can't", "cannot", "unable", "didn't", "don't", "won't"]
        positive_words = ['is', 'are', 'was', 'were', 'like', 'love', 'prefer', 'can', 'able']
        
        a_has_neg = any(neg in a_content for neg in negation_words)
        b_has_neg = any(neg in b_content for neg in negation_words)
        a_has_pos = any(pos in a_content for pos in positive_words)
        b_has_pos = any(pos in b_content for pos in positive_words)
        
        if (a_has_neg and b_has_pos) or (a_has_pos and b_has_neg):
            # Check if they share context (same subject)
            a_words = set(a_content.split())
            b_words = set(b_content.split())
            shared_words = a_words & b_words
            # Filter out stop words
            stop_words = {'user', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'but'}
            meaningful_shared = shared_words - stop_words
            if len(meaningful_shared) >= 1:
                return ConflictReport(
                    entry_a=entry_a,
                    entry_b=entry_b,
                    conflict_type='contradiction',
                    confidence_delta=abs(entry_a.confidence - entry_b.confidence),
                    suggested_resolution='manual_review'
                )
        
        return None
    
    @classmethod
    def _check_temporal_conflict(
        cls,
        entry_a: MemoryEntry,
        entry_b: MemoryEntry
    ) -> Optional[ConflictReport]:
        """Check for temporal conflicts (same topic, different times)."""
        # Extract potential subject from both entries
        a_words = set(entry_a.content.lower().split())
        b_words = set(entry_b.content.lower().split())
        common_words = a_words & b_words
        
        # High word overlap suggests same topic
        if len(common_words) >= 3:
            # Check for temporal markers
            temporal_patterns = [
                r'\b(now|currently|today)\b',
                r'\b(then|before|previously)\b',
                r'\b(yesterday|last week|last month)\b',
                r'\b(tomorrow|next week|soon)\b',
            ]
            
            a_has_temporal = any(re.search(p, entry_a.content) for p in temporal_patterns)
            b_has_temporal = any(re.search(p, entry_b.content) for p in temporal_patterns)
            
            if a_has_temporal and b_has_temporal:
                return ConflictReport(
                    entry_a=entry_a,
                    entry_b=entry_b,
                    conflict_type='temporal',
                    confidence_delta=abs(entry_a.confidence - entry_b.confidence),
                    suggested_resolution='timestamp_priority'
                )
        
        return None
    
    @classmethod
    def _check_semantic_conflict(
        cls,
        entry_a: MemoryEntry,
        entry_b: MemoryEntry,
        threshold: float
    ) -> Optional[ConflictReport]:
        """Check for semantic conflicts based on content overlap."""
        # Simple semantic similarity: word overlap ratio
        a_words = set(entry_a.content.lower().split())
        b_words = set(entry_b.content.lower().split())
        
        if not a_words or not b_words:
            return None
        
        intersection = len(a_words & b_words)
        union = len(a_words | b_words)
        
        similarity = intersection / union if union > 0 else 0
        
        # High similarity but different content = potential conflict
        if 0.5 < similarity < threshold:
            return ConflictReport(
                entry_a=entry_a,
                entry_b=entry_b,
                conflict_type='semantic',
                confidence_delta=abs(entry_a.confidence - entry_b.confidence),
                suggested_resolution='merge_or_clarify'
            )
        
        return None


class MemoryStore:
    """Backend storage for memory with quality features."""
    
    def __init__(self, storage_path: str = ".memory_store"):
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(exist_ok=True)
        self._index: Dict[str, MemoryEntry] = {}
        self._load_index()
    
    def _load_index(self):
        """Load the memory index from disk."""
        index_file = self.storage_path / "index.json"
        if index_file.exists():
            with open(index_file, 'r') as f:
                data = json.load(f)
                self._index = {
                    k: MemoryEntry.from_dict(v) for k, v in data.items()
                }
    
    def _save_index(self):
        """Save the memory index to disk."""
        index_file = self.storage_path / "index.json"
        with open(index_file, 'w') as f:
            data = {k: v.to_dict() for k, v in self._index.items()}
            json.dump(data, f, indent=2)
    
    def add(
        self,
        content: str,
        path: str,
        source_type: str,
        line_start: Optional[int] = None,
        line_end: Optional[int] = None,
        excerpt: Optional[str] = None,
        tags: Optional[List[str]] = None
    ) -> Tuple[MemoryEntry, List[ConflictReport]]:
        """
        Add a memory entry with quality tracking.
        
        Returns:
            Tuple of (created entry, list of conflicts detected)
        """
        now = datetime.now().isoformat()
        
        # Create citation if source info provided
        citation = None
        if line_start is not None:
            citation = Citation(
                path=path,
                line_start=line_start,
                line_end=line_end or line_start,
                excerpt=excerpt or content[:200],
                timestamp=now,
                version_hash=hashlib.sha256(
                    f"{path}:{line_start}:{content}".encode()
                ).hexdigest()[:8]
            )
        
        # Create entry
        entry = MemoryEntry(
            content=content,
            path=path,
            source_type=source_type,
            created_at=now,
            last_accessed=now,
            access_count=0,
            confidence=0.0,  # Will be calculated
            citation=citation,
            tags=tags or [],
            semantic_hash=ConflictDetector.compute_semantic_hash(content)
        )
        
        # Check for conflicts
        conflicts = ConflictDetector.detect_conflicts(
            entry, list(self._index.values())
        )
        
        # Calculate confidence
        entry.confidence = ConfidenceScorer.calculate_confidence(entry)
        
        # Adjust confidence if conflicts found
        if conflicts:
            entry.confidence = ConfidenceScorer.adjust_for_conflicts(entry, conflicts)
        
        # Store entry
        entry_id = hashlib.sha256(f"{path}:{now}".encode()).hexdigest()[:16]
        self._index[entry_id] = entry
        self._save_index()
        
        return entry, conflicts
    
    def search(
        self,
        query: str,
        min_confidence: float = 0.0,
        max_results: int = 10,
        source_filter: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Search memories with quality-aware ranking.
        
        Returns:
            Dict containing results, citations, and confidence metadata
        """
        query_lower = query.lower()
        query_words = set(query_lower.split())
        
        scored_results = []
        
        for entry_id, entry in self._index.items():
            # Apply filters
            if entry.confidence < min_confidence:
                continue
            if source_filter and entry.source_type != source_filter:
                continue
            
            # Calculate relevance score
            entry_words = set(entry.content.lower().split())
            intersection = len(query_words & entry_words)
            union = len(query_words | entry_words)
            relevance = intersection / union if union > 0 else 0
            
            if relevance == 0:
                continue
            
            # Update entry stats
            entry.access_count += 1
            entry.last_accessed = datetime.now().isoformat()
            
            # Recalculate confidence with relevance
            entry.confidence = ConfidenceScorer.calculate_confidence(entry, relevance)
            
            # Combined score: confidence * relevance
            combined_score = entry.confidence * relevance
            
            scored_results.append({
                'id': entry_id,
                'entry': entry,
                'relevance_score': round(relevance, 4),
                'combined_score': round(combined_score, 4)
            })
        
        # Sort by combined score
        scored_results.sort(key=lambda x: x['combined_score'], reverse=True)
        
        # Build response
        results_list = []
        for r in scored_results[:max_results]:
            entry_dict = r['entry'].to_dict()
            entry_dict['id'] = r['id']
            entry_dict['relevance_score'] = r['relevance_score']
            entry_dict['combined_score'] = r['combined_score']
            results_list.append(entry_dict)
        
        # Determine if fallback is in effect
        fallback_used = len(results_list) == 0
        
        if fallback_used and min_confidence > 0:
            # Retry with lower confidence threshold
            return self.search(query, min_confidence=0.0, max_results=max_results)
        
        self._save_index()  # Persist access count updates
        
        return {
            'query': query,
            'results': results_list,
            'count': len(results_list),
            'min_confidence_threshold': min_confidence,
            'fallback': {
                'used': fallback_used,
                'reason': 'No results above confidence threshold' if fallback_used else None
            },
            'citations': 'auto' if any(r.get('citation') for r in results_list) else 'none'
        }
    
    def get(self, entry_id: str) -> Optional[MemoryEntry]:
        """Get a specific memory entry by ID."""
        entry = self._index.get(entry_id)
        if entry:
            entry.access_count += 1
            entry.last_accessed = datetime.now().isoformat()
            self._save_index()
        return entry
    
    def get_all_conflicts(self) -> List[ConflictReport]:
        """Get all conflicts across the memory store."""
        all_conflicts = []
        entries = list(self._index.values())
        
        for i, entry in enumerate(entries):
            conflicts = ConflictDetector.detect_conflicts(
                entry, entries[i+1:]
            )
            all_conflicts.extend(conflicts)
        
        return all_conflicts


# Global store instance (singleton pattern)
_memory_store: Optional[MemoryStore] = None


def get_memory_store() -> MemoryStore:
    """Get or create the global memory store."""
    global _memory_store
    if _memory_store is None:
        _memory_store = MemoryStore()
    return _memory_store


def reset_memory_store():
    """Reset the memory store (for testing)."""
    global _memory_store
    _memory_store = None