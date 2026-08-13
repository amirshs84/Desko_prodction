from __future__ import annotations

class DomainError(Exception):
    ...


# ----------- Core -----------

class InvalidStatusTransition(DomainError):
    ...


class NaiveDatetimeNotAllowed(DomainError):
    ...

# ----------- Problem Aggregate -----------

class ProblemNotEditable(DomainError):
    ...


class ProblemNotFound(DomainError):
    ...

# ----------- Exam Aggregate -----------

class ExamNotFound(DomainError):
    ...


class ExamNotEditable(DomainError):
    ...


class ExamProblemNotFound(DomainError):
    ...


class DuplicateExamProblem(DomainError):
    ...


class EmptyExamCannotBePublished(DomainError):
    ...


class InvalidScoring(DomainError):
    ...


class InvalidExamTitle(DomainError):
    ...


class IncompleteReorder(DomainError):
    ...


class ExamHasSessions(DomainError):
    ...

# ----------- ExamSession Aggregate -----------

class ExamSessionNotFound(DomainError):
    ...

class InvalidSnapshotOrderIndex(DomainError):
    ...


class InvalidTimePeriod(DomainError):
    ...


class InvalidSessionStartTime(DomainError):
    ...


class InvalidSessionEndTime(DomainError):
    ...


class EmptySessionNotAllowed(DomainError):
    ...


class SessionNotStartedYet(DomainError):
    ...


class ParticipantsNotModifiable(DomainError):
    ...


class DuplicateSessionParticipant(DomainError):
    ...


class SessionParticipantNotFound(DomainError):
    ...


class SessionAlreadyExpired(DomainError):
    ...


class DuplicateSnapshotOrderIndex(DomainError):
    ...


class SessionWasCancelled(DomainError):
    ...


class ExamSessionProblemNotFound(DomainError):
    ...


class ParticipantNotFound(DomainError):
    ...


class ParticipantIsNotAssigned(DomainError):
    ...

# ----------- SessionAttempt Aggregate -----------

class AnswerNotFound(DomainError):
    ...


class AttemptAlreadyExists(DomainError):
    ...


class AttemptNotGraded(DomainError):
    ...


class AttemptNotInProgress(DomainError):
    ...


class AttemptNotSubmitted(DomainError):
    ...


class InvalidAttemptScore(DomainError):
    ...


class InvalidAnswerScore(DomainError):
    ...


class IncompleteGrading(DomainError):
    ...


class InvalidAttemptDeadline(DomainError):
    ...


class AttemptExpired(DomainError):
    ...


class SessionAttemptNotFound(DomainError):
    ...


class AttemptAlreadySubmitted(DomainError):
    ...


class MissingProblemGradingDataError(DomainError):
    ...