import { useEffect, useMemo, useState } from "react";
import { useAuth, useRole } from "../auth/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
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
import { FileText, Send, CheckCircle, MessageSquare } from "lucide-react";
import { Separator } from "../components/ui/separator";

interface Report {
  id: number;
  patientName: string;
  patientAge: number;
  diagnosis: string;
  therapist: string;
  dateCreated: string;
  sessionsCompleted: number;
  totalSessions: number;
  initialAssessment: string;
  progressNotes: string;
  currentStatus: string;
  recommendations: string;
  status: "draft" | "submitted" | "approved" | "needs-revision";
  supervisorComment?: string;
}

export default function Reports() {
  const role = useRole();
  const { token } = useAuth();
  const API_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:4000";
  const [selectedReport, setSelectedReport] = useState<number | null>(null);
  const [supervisorFeedback, setSupervisorFeedback] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newReport, setNewReport] = useState({
    patientName: "",
    patientAge: "",
    diagnosis: "",
    therapistName: "",
    totalSessions: "",
    sessionsCompleted: "",
    dueDate: "",
    initialAssessment: "",
    progressNotes: "",
    currentStatus: "",
    recommendations: "",
    status: "draft",
  });

  const [reports, setReports] = useState<Report[]>([]);

  const [editingReport, setEditingReport] = useState<Report | null>(null);

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

  const toReport = (r: any): Report => ({
    id: r.id,
    patientName: r.patientName || "Unknown",
    patientAge: r.patientAge ?? 0,
    diagnosis: r.diagnosis || "",
    therapist: r.therapist || "",
    dateCreated: formatDate(r.createdAt),
    sessionsCompleted: r.sessionsCompleted ?? 0,
    totalSessions: r.totalSessions ?? 0,
    initialAssessment: r.initialAssessment || "",
    progressNotes: r.progressNotes || "",
    currentStatus: r.currentStatus || "",
    recommendations: r.recommendations || "",
    status: r.status || "draft",
    supervisorComment: r.supervisorComment || "",
  });

  useEffect(() => {
    let active = true;
    const fetchReports = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/reports`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || "Failed to load reports");
        }
        const data = await res.json();
        if (!active) return;
        const mapped = (data.reports || []).map(toReport) as Report[];
        setReports(mapped);
        if (mapped.length && selectedReport === null) {
          setSelectedReport(mapped[0].id);
        }
        setError("");
      } catch (err) {
        if (!active) return;
        setError((err as Error).message || "Failed to load reports");
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchReports();
    return () => {
      active = false;
    };
  }, [API_URL, token, selectedReport]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800 border-green-200";
      case "submitted":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "needs-revision":
        return "bg-red-100 text-red-800 border-red-200";
      case "draft":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const handleApproveReport = async (reportId: number) => {
    try {
      const res = await fetch(`${API_URL}/reports/${reportId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "approved" }),
      });
      if (!res.ok) throw new Error("Failed to approve report");
      const data = await res.json();
      const mapped = toReport(data.report);
      setReports((prev) => prev.map((r) => (r.id === reportId ? mapped : r)));
      setError("");
    } catch (err) {
      setError((err as Error).message || "Unable to approve report");
    }
  };

  const handleAddReport = async () => {
    if (!newReport.patientName.trim() || !newReport.patientAge || !newReport.diagnosis.trim()) {
      setError("Patient name, age, and diagnosis are required.");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patientName: newReport.patientName.trim(),
          patientAge: Number(newReport.patientAge),
          diagnosis: newReport.diagnosis.trim(),
          therapistName: newReport.therapistName.trim() || undefined,
          totalSessions: Number(newReport.totalSessions) || 0,
          sessionsCompleted: Number(newReport.sessionsCompleted) || 0,
          dueDate: newReport.dueDate || undefined,
          initialAssessment: newReport.initialAssessment.trim(),
          progressNotes: newReport.progressNotes.trim(),
          currentStatus: newReport.currentStatus.trim(),
          recommendations: newReport.recommendations.trim(),
          status: newReport.status,
        }),
      });
      if (!res.ok) throw new Error("Failed to add report");
      const data = await res.json();
      const mapped = toReport(data.report);
      setReports((prev) => [mapped, ...prev]);
      setNewReport({
        patientName: "",
        patientAge: "",
        diagnosis: "",
        therapistName: "",
        totalSessions: "",
        sessionsCompleted: "",
        dueDate: "",
        initialAssessment: "",
        progressNotes: "",
        currentStatus: "",
        recommendations: "",
        status: "draft",
      });
      setShowAddForm(false);
      setError("");
    } catch (err) {
      setError((err as Error).message || "Unable to add report");
    }
  };

  const handleRequestRevision = async (reportId: number) => {
    try {
      const res = await fetch(`${API_URL}/reports/${reportId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: "needs-revision",
          supervisorComment: supervisorFeedback,
        }),
      });
      if (!res.ok) throw new Error("Failed to request revision");
      const data = await res.json();
      const mapped = toReport(data.report);
      setReports((prev) => prev.map((r) => (r.id === reportId ? mapped : r)));
      setSupervisorFeedback("");
      setError("");
    } catch (err) {
      setError((err as Error).message || "Unable to request revision");
    }
  };

  const handleSubmitReport = async (reportId: number) => {
    try {
      const res = await fetch(`${API_URL}/reports/${reportId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "submitted" }),
      });
      if (!res.ok) throw new Error("Failed to submit report");
      const data = await res.json();
      const mapped = toReport(data.report);
      setReports((prev) => prev.map((r) => (r.id === reportId ? mapped : r)));
      setEditingReport(null);
      setError("");
    } catch (err) {
      setError((err as Error).message || "Unable to submit report");
    }
  };

  const handleEditReport = (field: keyof Report, value: string) => {
    if (editingReport) {
      setEditingReport({ ...editingReport, [field]: value });
    }
  };

  const handleSaveEdit = async () => {
    if (!editingReport) return;
    try {
      const res = await fetch(`${API_URL}/reports/${editingReport.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editingReport),
      });
      if (!res.ok) throw new Error("Failed to save report");
      const data = await res.json();
      const mapped = toReport(data.report);
      setReports((prev) => prev.map((r) => (r.id === editingReport.id ? mapped : r)));
      setEditingReport(null);
      setError("");
    } catch (err) {
      setError((err as Error).message || "Unable to save report");
    }
  };

  const selectedReportData = useMemo(
    () => reports.find((r) => r.id === selectedReport) || null,
    [reports, selectedReport]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Progress Reports</h2>
        <p className="text-gray-600 mt-1">Create and manage patient progress documentation</p>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">Manage reports and approvals.</div>
        {role === "therapist" && (
          <Button
            onClick={() => setShowAddForm((prev) => !prev)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {showAddForm ? "Close" : "Add Report"}
          </Button>
        )}
      </div>

      {showAddForm && role === "therapist" && (
        <Card className="border-2 border-blue-200">
          <CardHeader className="bg-blue-50">
            <CardTitle>New Report</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Patient Name</Label>
                <Input
                  value={newReport.patientName}
                  onChange={(e) => setNewReport({ ...newReport, patientName: e.target.value })}
                />
              </div>
              <div>
                <Label>Patient Age</Label>
                <Input
                  type="number"
                  min={1}
                  value={newReport.patientAge}
                  onChange={(e) => setNewReport({ ...newReport, patientAge: e.target.value })}
                />
              </div>
              <div>
                <Label>Diagnosis</Label>
                <Input
                  value={newReport.diagnosis}
                  onChange={(e) => setNewReport({ ...newReport, diagnosis: e.target.value })}
                />
              </div>
              <div>
                <Label>Therapist</Label>
                <Input
                  value={newReport.therapistName}
                  onChange={(e) =>
                    setNewReport({ ...newReport, therapistName: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Total Sessions</Label>
                <Input
                  type="number"
                  min={0}
                  value={newReport.totalSessions}
                  onChange={(e) =>
                    setNewReport({ ...newReport, totalSessions: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Sessions Completed</Label>
                <Input
                  type="number"
                  min={0}
                  value={newReport.sessionsCompleted}
                  onChange={(e) =>
                    setNewReport({ ...newReport, sessionsCompleted: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={newReport.dueDate}
                  onChange={(e) => setNewReport({ ...newReport, dueDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={newReport.status}
                  onValueChange={(value) => setNewReport({ ...newReport, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="needs-revision">Needs Revision</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Initial Assessment</Label>
              <Textarea
                rows={3}
                value={newReport.initialAssessment}
                onChange={(e) =>
                  setNewReport({ ...newReport, initialAssessment: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Progress Notes</Label>
              <Textarea
                rows={3}
                value={newReport.progressNotes}
                onChange={(e) =>
                  setNewReport({ ...newReport, progressNotes: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Current Status</Label>
              <Textarea
                rows={2}
                value={newReport.currentStatus}
                onChange={(e) =>
                  setNewReport({ ...newReport, currentStatus: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Recommendations</Label>
              <Textarea
                rows={2}
                value={newReport.recommendations}
                onChange={(e) =>
                  setNewReport({ ...newReport, recommendations: e.target.value })
                }
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAddReport} className="bg-blue-600 hover:bg-blue-700">
                Save Report
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reports List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Report List</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading && <p className="text-sm text-gray-500">Loading reports...</p>}
              {!loading && reports.length === 0 && (
                <p className="text-sm text-gray-500">No reports yet.</p>
              )}
              {reports.map((report) => (
                <button
                  key={report.id}
                  onClick={() => setSelectedReport(report.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedReport === report.id
                      ? "bg-blue-50 border-blue-300 shadow-sm"
                      : "bg-white border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{report.patientName}</p>
                      <p className="text-xs text-gray-500 mt-1">{report.dateCreated}</p>
                    </div>
                    <Badge className={`${getStatusColor(report.status)} text-xs ml-2`}>
                      {report.status === "needs-revision"
                        ? "Needs Revision"
                        : report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                    </Badge>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Report Details */}
        <div className="lg:col-span-2">
          {selectedReportData && (
            <>
              {reports
                .filter((r) => r.id === selectedReport)
                .map((report) => {
                  const isEditing = editingReport?.id === report.id;
                  const currentReport = isEditing ? editingReport : report;

                  return (
                    <Card key={report.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <FileText className="w-6 h-6 text-blue-600" />
                            <div>
                              <CardTitle>Progress Report</CardTitle>
                              <p className="text-sm text-gray-600 mt-1">
                                {report.patientName} - {report.dateCreated}
                              </p>
                            </div>
                          </div>
                          <Badge className={getStatusColor(report.status)}>
                            {report.status === "needs-revision"
                              ? "Needs Revision"
                              : report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Patient Information (Auto-filled) */}
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <h3 className="font-medium text-gray-900 mb-3">Patient Information</h3>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <Label className="text-gray-600">Name</Label>
                              <p className="font-medium">{report.patientName}</p>
                            </div>
                            <div>
                              <Label className="text-gray-600">Age</Label>
                              <p className="font-medium">{report.patientAge} years</p>
                            </div>
                            <div>
                              <Label className="text-gray-600">Diagnosis</Label>
                              <p className="font-medium">{report.diagnosis}</p>
                            </div>
                            <div>
                              <Label className="text-gray-600">Sessions</Label>
                              <p className="font-medium">
                                {report.sessionsCompleted}/{report.totalSessions}
                              </p>
                            </div>
                            <div className="col-span-2">
                              <Label className="text-gray-600">Therapist</Label>
                              <p className="font-medium">{report.therapist}</p>
                            </div>
                          </div>
                        </div>

                        {/* Editable Sections */}
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="initialAssessment">Initial Assessment</Label>
                            {isEditing ? (
                              <Textarea
                                id="initialAssessment"
                                value={currentReport.initialAssessment}
                                onChange={(e) =>
                                  handleEditReport("initialAssessment", e.target.value)
                                }
                                rows={3}
                                className="mt-2"
                              />
                            ) : (
                              <p className="text-sm text-gray-700 mt-2 p-3 bg-gray-50 rounded border">
                                {currentReport.initialAssessment}
                              </p>
                            )}
                          </div>

                          <div>
                            <Label htmlFor="progressNotes">Progress Notes</Label>
                            {isEditing ? (
                              <Textarea
                                id="progressNotes"
                                value={currentReport.progressNotes}
                                onChange={(e) => handleEditReport("progressNotes", e.target.value)}
                                rows={4}
                                className="mt-2"
                              />
                            ) : (
                              <p className="text-sm text-gray-700 mt-2 p-3 bg-gray-50 rounded border">
                                {currentReport.progressNotes}
                              </p>
                            )}
                          </div>

                          <div>
                            <Label htmlFor="currentStatus">Current Status</Label>
                            {isEditing ? (
                              <Textarea
                                id="currentStatus"
                                value={currentReport.currentStatus}
                                onChange={(e) => handleEditReport("currentStatus", e.target.value)}
                                rows={2}
                                className="mt-2"
                              />
                            ) : (
                              <p className="text-sm text-gray-700 mt-2 p-3 bg-gray-50 rounded border">
                                {currentReport.currentStatus}
                              </p>
                            )}
                          </div>

                          <div>
                            <Label htmlFor="recommendations">Recommendations</Label>
                            {isEditing ? (
                              <Textarea
                                id="recommendations"
                                value={currentReport.recommendations}
                                onChange={(e) =>
                                  handleEditReport("recommendations", e.target.value)
                                }
                                rows={3}
                                className="mt-2"
                              />
                            ) : (
                              <p className="text-sm text-gray-700 mt-2 p-3 bg-gray-50 rounded border">
                                {currentReport.recommendations}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Supervisor Comments */}
                        {report.supervisorComment && (
                          <>
                            <Separator />
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                              <div className="flex items-start gap-2">
                                <MessageSquare className="w-4 h-4 text-red-600 mt-0.5" />
                                <div className="flex-1">
                                  <Label className="text-red-900">Supervisor Feedback</Label>
                                  <p className="text-sm text-red-800 mt-1">
                                    {report.supervisorComment}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </>
                        )}

                        {/* Therapist Actions */}
                        {role === "therapist" && (
                          <>
                            <Separator />
                            <div className="flex gap-2">
                              {!isEditing ? (
                                <>
                                  <Button
                                    onClick={() => setEditingReport(report)}
                                    variant="outline"
                                  >
                                    Edit Report
                                  </Button>
                                  {report.status === "draft" && (
                                    <Button
                                      onClick={() => handleSubmitReport(report.id)}
                                      className="bg-blue-600 hover:bg-blue-700"
                                    >
                                      <Send className="w-4 h-4 mr-2" />
                                      Submit for Review
                                    </Button>
                                  )}
                                </>
                              ) : (
                                <>
                                  <Button
                                    onClick={handleSaveEdit}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    Save Changes
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => setEditingReport(null)}
                                  >
                                    Cancel
                                  </Button>
                                </>
                              )}
                            </div>
                          </>
                        )}

                        {/* Supervisor Review Panel */}
                        {role === "supervisor" && report.status === "submitted" && (
                          <>
                            <Separator />
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                              <Label className="text-gray-900 mb-3 block">
                                Supervisor Review
                              </Label>
                              <Textarea
                                placeholder="Add feedback or comments..."
                                value={supervisorFeedback}
                                onChange={(e) => setSupervisorFeedback(e.target.value)}
                                rows={3}
                                className="mb-3"
                              />
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => handleApproveReport(report.id)}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Approve Report
                                </Button>
                                <Button
                                  onClick={() => handleRequestRevision(report.id)}
                                  variant="outline"
                                  className="border-red-300 text-red-700 hover:bg-red-50"
                                  disabled={!supervisorFeedback.trim()}
                                >
                                  Request Revision
                                </Button>
                              </div>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
            </>
          )}

          {!selectedReport && (
            <Card className="h-96 flex items-center justify-center">
              <CardContent>
                <div className="text-center text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Select a report to view details</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
