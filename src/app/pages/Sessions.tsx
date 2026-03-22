import { useEffect, useMemo, useState } from "react";
import { useAuth, useRole } from "../auth/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

interface Session {
  id: number;
  sessionNumber: number;
  date: string;
  sessionDate?: string;
  status: "completed" | "upcoming" | "in-progress";
  notes?: string;
  activities?: string[];
  progress?: string;
  supervisorFeedback?: string;
  therapistUsername?: string;
  therapyPlanId?: number;
}

interface PatientSession {
  id: number;
  patientName: string;
  totalSessions: number;
  completedSessions: number;
  sessions: Session[];
  goal: string;
}

export default function Sessions() {
  const role = useRole();
  const { token, user } = useAuth();
  const API_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:4000";
  const [selectedPatient, setSelectedPatient] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showSessionDetailsForm, setShowSessionDetailsForm] = useState(false);
  const [detailSessionNumber, setDetailSessionNumber] = useState("");
  const [detailSessionDate, setDetailSessionDate] = useState("");
  const [detailActivities, setDetailActivities] = useState("");
  const [detailProgress, setDetailProgress] = useState("");
  const [detailSessionStatus, setDetailSessionStatus] = useState<
    "completed" | "in-progress" | "upcoming"
  >("upcoming");
  const [detailSessionNotes, setDetailSessionNotes] = useState("");
  const [detailPlanId, setDetailPlanId] = useState("");
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
  const [feedbackSessionId, setFeedbackSessionId] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [activePatients, setActivePatients] = useState<
    Array<{ id: number; name: string; status: string; assignedTherapist?: string }>
  >([]);
  const [planPatients, setPlanPatients] = useState<
    Array<{ id: number; name: string; duration: number; status: string }>
  >([]);

  const [patientSessions, setPatientSessions] = useState<PatientSession[]>([]);

  const therapistAliasToUsername = useMemo(
    () =>
      new Map([
        ["therapist01", "emily_therapist"],
        ["therapist02", "james_therapist"],
        ["therapist03", "sarah_therapist"],
        ["therapist04", "michael_therapist"],
        ["dr. emily roberts", "emily_therapist"],
        ["dr. james wilson", "james_therapist"],
        ["dr. sarah anderson", "sarah_therapist"],
        ["dr. michael thompson", "michael_therapist"],
      ]),
    []
  );
  const therapistDisplayNameByUsername = useMemo(
    () =>
      new Map([
        ["therapist01", "dr. emily roberts"],
        ["therapist02", "dr. james wilson"],
        ["therapist03", "dr. sarah anderson"],
        ["therapist04", "dr. michael thompson"],
        ["emily_therapist", "dr. emily roberts"],
        ["james_therapist", "dr. james wilson"],
        ["sarah_therapist", "dr. sarah anderson"],
        ["michael_therapist", "dr. michael thompson"],
      ]),
    []
  );
  const normalize = (value?: string) => (value || "").trim().toLowerCase();
  const isTherapistMatch = (assigned?: string, username?: string) => {
    if (!username) return false;
    const assignedValue = normalize(assigned);
    const usernameValue = normalize(username);
    if (assignedValue === usernameValue) return true;
    const aliasFromAssigned = therapistAliasToUsername.get(assignedValue);
    if (aliasFromAssigned && normalize(aliasFromAssigned) === usernameValue) return true;
    const aliasFromUser = therapistAliasToUsername.get(usernameValue);
    if (aliasFromUser && normalize(aliasFromUser) === assignedValue) return true;
    const displayName = therapistDisplayNameByUsername.get(usernameValue);
    if (displayName && assignedValue === displayName) return true;
    return false;
  };

  const formatDate = (value?: string) => {
    if (!value) return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  useEffect(() => {
    let active = true;
    const fetchSessions = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const [res, patientsRes, plansRes] = await Promise.all([
          fetch(`${API_URL}/sessions`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/patients`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/therapy-plans`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || "Failed to load sessions");
        }
        const data = await res.json();
        if (!active) return;
        const mapped = (data.patientSessions || []).map((p: any) => ({
          ...p,
          sessions: (p.sessions || []).map((s: any) => ({
            ...s,
            id: s.id,
            date: formatDate(s.date || s.sessionDate),
            sessionDate: s.sessionDate || s.date,
            activities: s.activities || [],
            progress: s.progress || "",
            supervisorFeedback: s.supervisorFeedback || "",
            therapistUsername: s.therapistUsername,
            therapyPlanId: s.therapyPlanId,
          })),
        }));
        setPatientSessions(mapped);
        if (mapped.length && selectedPatient === null) {
          setSelectedPatient(mapped[0].id);
        }
        if (patientsRes.ok) {
          const patientsData = await patientsRes.json();
          const active = (patientsData.patients || []).filter(
            (p: any) => p.status === "active"
          );
          setActivePatients(active);
        }
        if (plansRes.ok) {
          const plansData = await plansRes.json();
          const planRows = (plansData.plans || []).map((p: any) => ({
            id: p.id,
            name: p.patientName,
            duration: p.duration || 0,
            status: p.status,
          }));
          setPlanPatients(planRows);
        }
        setError("");
      } catch (err) {
        if (!active) return;
        setError((err as Error).message || "Unable to load sessions");
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchSessions();
    return () => {
      active = false;
    };
  }, [API_URL, token, selectedPatient, refreshKey]);

  const displayPatients = useMemo(() => {
    const byId = new Map(patientSessions.map((p) => [p.id, p]));
    const planByName = new Map(
      planPatients
        .filter((p) => p.status === "approved")
        .map((p) => [p.name, p.duration])
    );
    const activeOnly = activePatients.filter((p) => p.status === "active");
    const scoped =
      role === "therapist" && user?.username
        ? activeOnly.filter((p) => isTherapistMatch(p.assignedTherapist, user.username))
        : activeOnly;
    return scoped.map((p) => {
      const existing = byId.get(p.id);
      const approvedDuration = planByName.get(p.name) || 0;
      if (existing) {
        return {
          ...existing,
          totalSessions: Math.max(existing.totalSessions, approvedDuration),
        };
      }
      return {
        id: p.id,
        patientName: p.name,
        totalSessions: approvedDuration,
        completedSessions: 0,
        sessions: [],
        goal: "No sessions yet",
      } as PatientSession;
    });
  }, [
    activePatients,
    patientSessions,
    planPatients,
    role,
    user?.username,
    therapistAliasToUsername,
    therapistDisplayNameByUsername,
  ]);

  const selectedPatientData = useMemo(
    () => displayPatients.find((p) => p.id === selectedPatient),
    [displayPatients, selectedPatient]
  );

  useEffect(() => {
    if (selectedPatient !== null) return;
    if (displayPatients.length > 0) {
      setSelectedPatient(displayPatients[0].id);
    }
  }, [displayPatients, selectedPatient]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setRefreshKey((prev) => prev + 1);
    }, 15000);
    return () => clearInterval(intervalId);
  }, []);
  const activePatientOptions = useMemo(() => {
    const set = new Set(planPatients.map((p) => p.name));
    const filtered = activePatients.filter((p) => p.status === "active");
    const therapistFiltered =
      role === "therapist" && user?.username
        ? filtered.filter((p) => isTherapistMatch(p.assignedTherapist, user.username))
        : filtered;
    return therapistFiltered.map((p) => ({
      id: p.id,
      name: p.name,
      hasPlan: set.has(p.name),
    }));
  }, [
    activePatients,
    planPatients,
    role,
    user?.username,
    therapistAliasToUsername,
    therapistDisplayNameByUsername,
  ]);
  const approvedPlanDuration = useMemo(() => {
    const match = planPatients.find(
      (p) => p.name === selectedPatientData?.patientName && p.status === "approved"
    );
    return match?.duration ?? 0;
  }, [planPatients, selectedPatientData]);
  const approvedPlansForSelected = useMemo(
    () =>
      planPatients.filter(
        (p) => p.name === selectedPatientData?.patientName && p.status === "approved"
      ),
    [planPatients, selectedPatientData]
  );
  const progressPercentage = selectedPatientData
    ? (selectedPatientData.completedSessions / Math.max(selectedPatientData.totalSessions, 1)) *
      100
    : 0;

  useEffect(() => {
    if (editingSessionId !== null) return;
    if (!detailPlanId && approvedPlansForSelected.length > 0) {
      setDetailPlanId(String(approvedPlansForSelected[0].id));
    }
  }, [approvedPlansForSelected, detailPlanId, editingSessionId]);

  useEffect(() => {
    if (editingSessionId !== null) return;
    setDetailPlanId("");
  }, [selectedPatient, editingSessionId]);

  const handleSaveSessionDetails = async () => {
    if (!selectedPatientData) return;
    if (!detailSessionNumber) {
      setError("Session number is required.");
      return;
    }
    if (!detailPlanId) {
      setError("Therapy plan is required.");
      return;
    }
    try {
      const payload = {
        patientId: selectedPatientData.id,
        therapyPlanId: Number(detailPlanId),
        sessionNumber: Number(detailSessionNumber),
        sessionDate: detailSessionDate || undefined,
        activities: detailActivities
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        notes: detailSessionNotes,
        progress: detailProgress || undefined,
        status: detailSessionStatus,
      };
      const res = await fetch(
        editingSessionId ? `${API_URL}/sessions/${editingSessionId}` : `${API_URL}/sessions`,
        {
          method: editingSessionId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to save session details");
      }
      await res.json();
      setRefreshKey((prev) => prev + 1);
      setShowSessionDetailsForm(false);
      setDetailSessionNumber("");
      setDetailSessionDate("");
      setDetailSessionStatus("upcoming");
      setDetailSessionNotes("");
      setDetailActivities("");
      setDetailProgress("");
      setDetailPlanId("");
      setEditingSessionId(null);
      setError("");
    } catch (err) {
      setError((err as Error).message || "Unable to save session details");
    }
  };

  const handleEditSession = (session: Session) => {
    setShowSessionDetailsForm(true);
    setEditingSessionId(session.id);
    setDetailSessionNumber(String(session.sessionNumber));
    setDetailSessionDate(
      session.sessionDate ? new Date(session.sessionDate).toISOString().slice(0, 10) : ""
    );
    setDetailSessionStatus(session.status);
    setDetailSessionNotes(session.notes || "");
    setDetailActivities((session.activities || []).join(", "));
    setDetailProgress(session.progress || "");
    setDetailPlanId(session.therapyPlanId ? String(session.therapyPlanId) : "");
  };

  const handleDeleteSession = async (sessionId: number) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/sessions/${sessionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to delete session");
      await res.json();
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      setError((err as Error).message || "Unable to delete session");
    }
  };

  const handleSaveFeedback = async () => {
    if (!feedbackSessionId || !feedbackText.trim() || !token) return;
    try {
      const res = await fetch(`${API_URL}/sessions/${feedbackSessionId}/feedback`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ supervisorFeedback: feedbackText.trim() }),
      });
      if (!res.ok) throw new Error("Failed to save feedback");
      await res.json();
      setFeedbackSessionId(null);
      setFeedbackText("");
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      setError((err as Error).message || "Unable to save feedback");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Session Tracking</h2>
        <p className="text-gray-600 mt-1">Monitor therapy session progress and completion</p>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>

      {role === "therapist" && selectedPatientData && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Add or update session details.
          </div>
          <Button
            onClick={() => setShowSessionDetailsForm((prev) => !prev)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {showSessionDetailsForm ? "Close" : "+ Session Details"}
          </Button>
        </div>
      )}

      {showSessionDetailsForm && role === "therapist" && selectedPatientData && (
        <Card className="border-2 border-blue-200">
          <CardHeader className="bg-blue-50">
            <CardTitle>
              {editingSessionId ? "Edit" : "Add"} Session Details for{" "}
              {selectedPatientData.patientName}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label>Active Patients</Label>
              <Select
                value={String(selectedPatientData.id)}
                onValueChange={(value) => setSelectedPatient(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  {activePatientOptions.map((patient) => (
                    <SelectItem key={patient.id} value={String(patient.id)}>
                      {patient.name}{patient.hasPlan ? " - Plan" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-gray-600">
              Approved plan sessions:{" "}
              <span className="font-medium text-gray-900">
                {approvedPlanDuration > 0 ? approvedPlanDuration : "Not approved yet"}
              </span>
            </div>
            <div>
              <Label>Therapy Plan</Label>
              <Select
                value={detailPlanId}
                onValueChange={(value) => setDetailPlanId(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select approved plan" />
                </SelectTrigger>
                <SelectContent>
                  {approvedPlansForSelected.map((plan) => (
                    <SelectItem key={plan.id} value={String(plan.id)}>
                      Plan #{plan.id} - {plan.duration} sessions
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Session Number</Label>
                <Input
                  type="number"
                  min={1}
                  value={detailSessionNumber}
                  onChange={(e) => setDetailSessionNumber(e.target.value)}
                />
              </div>
              <div>
                <Label>Session Date</Label>
                <Input
                  type="date"
                  value={detailSessionDate}
                  onChange={(e) => setDetailSessionDate(e.target.value)}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={detailSessionStatus}
                  onValueChange={(value) =>
                    setDetailSessionStatus(
                      value as "completed" | "in-progress" | "upcoming"
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Activities (comma-separated)</Label>
              <Input
                value={detailActivities}
                onChange={(e) => setDetailActivities(e.target.value)}
                placeholder="e.g. articulation drills, reading aloud"
              />
            </div>
            <div>
              <Label>Progress</Label>
              <Input
                value={detailProgress}
                onChange={(e) => setDetailProgress(e.target.value)}
                placeholder="Short progress note"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                rows={3}
                value={detailSessionNotes}
                onChange={(e) => setDetailSessionNotes(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSaveSessionDetails}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {editingSessionId ? "Update Session" : "Save Session"}
              </Button>
              <Button variant="outline" onClick={() => setShowSessionDetailsForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Active Patients</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading && <p className="text-sm text-gray-500">Loading sessions...</p>}
              {!loading && patientSessions.length === 0 && (
                <p className="text-sm text-gray-500">No sessions yet.</p>
              )}
              {displayPatients.map((patient) => (
                <button
                  key={patient.id}
                  onClick={() => setSelectedPatient(patient.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedPatient === patient.id
                      ? "bg-blue-50 border-blue-300 shadow-sm"
                      : "bg-white border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <p className="font-medium text-gray-900">{patient.patientName}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {patient.completedSessions}/{patient.totalSessions} sessions
                  </p>
                  <Progress
                    value={
                      (patient.completedSessions / Math.max(patient.totalSessions, 1)) * 100
                    }
                    className="h-1.5 mt-2"
                  />
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Session Details */}
        <div className="lg:col-span-2 space-y-6">
          {selectedPatientData && (
            <>
              {/* Progress Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>{selectedPatientData.patientName}</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">{selectedPatientData.goal}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Progress</span>
                      <span className="text-sm font-semibold text-blue-600">
                        {selectedPatientData.completedSessions}/{selectedPatientData.totalSessions}{" "}
                        sessions completed
                      </span>
                    </div>
                    <Progress value={progressPercentage} className="h-3" />
                    <p className="text-xs text-gray-500 mt-2">
                      {Math.round(progressPercentage)}% complete
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-2xl font-bold text-green-600">
                        {selectedPatientData.completedSessions}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">Completed</p>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-2xl font-bold text-blue-600">
                        {selectedPatientData.sessions.filter((s) => s.status === "in-progress")
                          .length}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">In Progress</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-2xl font-bold text-gray-600">
                        {selectedPatientData.totalSessions -
                          selectedPatientData.completedSessions}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">Remaining</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Session Timeline */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Session Timeline</CardTitle>
                    {role === "therapist" && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setShowSessionDetailsForm(true);
                          setEditingSessionId(null);
                          setDetailPlanId("");
                          setDetailSessionNumber("");
                          setDetailSessionDate("");
                          setDetailSessionStatus("upcoming");
                          setDetailSessionNotes("");
                          setDetailActivities("");
                          setDetailProgress("");
                        }}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        +CreateSession
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
              {selectedPatientData.sessions.length === 0 && (
                <p className="text-sm text-gray-500">No sessions yet.</p>
              )}
              {selectedPatientData.sessions.map((session) => (
                      <div
                        key={session.id}
                        className={`flex items-start gap-4 p-4 rounded-lg border ${
                          session.status === "completed"
                            ? "bg-green-50 border-green-200"
                            : session.status === "in-progress"
                            ? "bg-blue-50 border-blue-200"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <div className="flex-shrink-0 mt-1">
                          {session.status === "completed" ? (
                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                          ) : session.status === "in-progress" ? (
                            <Clock className="w-6 h-6 text-blue-600" />
                          ) : (
                            <Circle className="w-6 h-6 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-gray-900">
                              Session {session.sessionNumber}
                            </p>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={
                                  session.status === "completed"
                                    ? "bg-white border-green-600 text-green-700"
                                    : session.status === "in-progress"
                                    ? "bg-white border-blue-600 text-blue-700"
                                    : "bg-white text-gray-600"
                                }
                              >
                                {session.status === "in-progress"
                                  ? "In Progress"
                                  : session.status.charAt(0).toUpperCase() +
                                    session.status.slice(1)}
                              </Badge>
                              {role === "therapist" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditSession(session)}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDeleteSession(session.id)}
                                  >
                                    Delete
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{session.date}</p>
                          {session.activities && session.activities.length > 0 && (
                            <p className="text-sm text-gray-700 mt-2">
                              Activities: {session.activities.join(", ")}
                            </p>
                          )}
                          {session.progress && (
                            <p className="text-sm text-gray-700 mt-2">
                              Progress: {session.progress}
                            </p>
                          )}
                          {session.notes && (
                            <p className="text-sm text-gray-700 mt-2 italic">
                              Notes: {session.notes}
                            </p>
                          )}
                          {session.supervisorFeedback && (
                            <p className="text-sm text-purple-700 mt-2">
                              Supervisor: {session.supervisorFeedback}
                            </p>
                          )}

                          {role === "supervisor" && (
                            <div className="mt-3 space-y-2">
                              {feedbackSessionId !== session.id && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setFeedbackSessionId(session.id);
                                    setFeedbackText(session.supervisorFeedback || "");
                                  }}
                                >
                                  Add Feedback
                                </Button>
                              )}
                              {feedbackSessionId === session.id && (
                                <>
                                  <Textarea
                                    rows={2}
                                    value={feedbackText}
                                    onChange={(e) => setFeedbackText(e.target.value)}
                                    placeholder="Supervisor feedback"
                                  />
                                  <div className="flex gap-2">
                                    <Button size="sm" onClick={handleSaveFeedback}>
                                      Save Feedback
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setFeedbackSessionId(null);
                                        setFeedbackText("");
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
