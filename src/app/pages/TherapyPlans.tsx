import { useEffect, useState } from "react";
import { useAuth, useRole } from "../auth/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Plus, Check, X, MessageSquare, FileText } from "lucide-react";
import { Separator } from "../components/ui/separator";

interface TherapyPlan {
  id: number;
  patientName: string;
  goal: string;
  activities: string[];
  duration: number;
  status: "approved" | "pending" | "changes-requested";
  therapist: string;
  supervisorComment?: string;
}

export default function TherapyPlans() {
  const role = useRole();
  const { token } = useAuth();
  const API_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:4000";
  const [showNewPlanForm, setShowNewPlanForm] = useState(false);
  const [newActivity, setNewActivity] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [patients, setPatients] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    patientName: "",
    goal: "",
    activities: [] as string[],
    duration: 10,
  });

  const [plans, setPlans] = useState<TherapyPlan[]>([]);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const [plansRes, patientsRes] = await Promise.all([
          fetch(`${API_URL}/therapy-plans`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/patients`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!plansRes.ok) throw new Error("Failed to load therapy plans");
        const plansData = await plansRes.json();

        const fetchedPlans = (plansData.plans || []).map((plan: any) => ({
          id: plan.id,
          patientName: plan.patientName,
          goal: plan.goal,
          activities: plan.activities || [],
          duration: plan.duration,
          status: plan.status,
          therapist: plan.therapist || "",
          supervisorComment: plan.supervisorComment || "",
        })) as TherapyPlan[];

        let patientNames: string[] = [];
        if (patientsRes.ok) {
          const patientsData = await patientsRes.json();
          patientNames = (patientsData.patients || []).map((p: any) => p.name);
        }

        if (!active) return;
        setPlans(fetchedPlans);
        setPatients(patientNames);
        setError("");
      } catch (err) {
        if (!active) return;
        setError((err as Error).message || "Unable to load therapy plans");
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchData();
    return () => {
      active = false;
    };
  }, [API_URL, token]);

  const presetActivities = [
    "Sound isolation exercises",
    "Word-level practice",
    "Sentence repetition",
    "Picture naming tasks",
    "Story comprehension",
    "Breathing exercises",
    "Fluency shaping techniques",
    "Voice therapy exercises",
    "Oral motor exercises",
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "changes-requested":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const handleAddActivity = (activity: string) => {
    if (activity && !formData.activities.includes(activity)) {
      setFormData({ ...formData, activities: [...formData.activities, activity] });
      setNewActivity("");
    }
  };

  const handleRemoveActivity = (activity: string) => {
    setFormData({
      ...formData,
      activities: formData.activities.filter((a) => a !== activity),
    });
  };

  const handleSubmitPlan = async () => {
    if (formData.patientName && formData.goal && formData.activities.length > 0) {
      try {
        const res = await fetch(`${API_URL}/therapy-plans`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...formData,
            therapist: "Dr. Emily Roberts",
            status: "pending",
          }),
        });

        if (!res.ok) throw new Error("Failed to submit plan");
        const data = await res.json();
        setPlans((prev) => [data.plan, ...prev]);
        setFormData({ patientName: "", goal: "", activities: [], duration: 10 });
        setShowNewPlanForm(false);
        setError("");
      } catch (err) {
        setError((err as Error).message || "Unable to submit plan");
      }
    }
  };

  const handleApprovePlan = async (planId: number) => {
    try {
      const res = await fetch(`${API_URL}/therapy-plans/${planId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "approved" }),
      });
      if (!res.ok) throw new Error("Failed to approve plan");
      const data = await res.json();
      setPlans((prev) => prev.map((p) => (p.id === planId ? data.plan : p)));
      setError("");
    } catch (err) {
      setError((err as Error).message || "Unable to approve plan");
    }
  };

  const handleRequestChanges = async (planId: number, comment: string) => {
    try {
      const res = await fetch(`${API_URL}/therapy-plans/${planId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "changes-requested", supervisorComment: comment }),
      });
      if (!res.ok) throw new Error("Failed to request changes");
      const data = await res.json();
      setPlans((prev) => prev.map((p) => (p.id === planId ? data.plan : p)));
      setError("");
    } catch (err) {
      setError((err as Error).message || "Unable to request changes");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Therapy Plans</h2>
          <p className="text-gray-600 mt-1">Create and manage individualized therapy plans</p>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </div>
        {role === "therapist" && (
          <Button
            onClick={() => setShowNewPlanForm(!showNewPlanForm)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Plan
          </Button>
        )}
      </div>

      {/* New Plan Form */}
      {showNewPlanForm && role === "therapist" && (
        <Card className="border-2 border-blue-200">
          <CardHeader className="bg-blue-50">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              New Therapy Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label htmlFor="patientName">Patient Name</Label>
              <Select
                value={formData.patientName}
                onValueChange={(value) => setFormData({ ...formData, patientName: value })}
              >
                <SelectTrigger id="patientName">
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient} value={patient}>
                      {patient}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="goal">Therapy Goal</Label>
              <Textarea
                id="goal"
                placeholder="Enter specific, measurable therapy goal..."
                value={formData.goal}
                onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <Label>Activities</Label>
              <div className="space-y-2">
                <Select value="" onValueChange={handleAddActivity}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select from preset activities" />
                  </SelectTrigger>
                  <SelectContent>
                    {presetActivities.map((activity) => (
                      <SelectItem key={activity} value={activity}>
                        {activity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex gap-2">
                  <Input
                    placeholder="Or add custom activity..."
                    value={newActivity}
                    onChange={(e) => setNewActivity(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleAddActivity(newActivity);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={() => handleAddActivity(newActivity)}
                    variant="outline"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {formData.activities.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.activities.map((activity) => (
                      <Badge
                        key={activity}
                        variant="secondary"
                        className="py-1.5 px-3 cursor-pointer hover:bg-red-100"
                        onClick={() => handleRemoveActivity(activity)}
                      >
                        {activity}
                        <X className="w-3 h-3 ml-2" />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="duration">Duration (Number of Sessions)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                max="50"
                value={formData.duration}
                onChange={(e) =>
                  setFormData({ ...formData, duration: parseInt(e.target.value) || 10 })
                }
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSubmitPlan} className="bg-blue-600 hover:bg-blue-700">
                Submit for Review
              </Button>
              <Button variant="outline" onClick={() => setShowNewPlanForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Plans */}
      <div className="space-y-4">
        {loading && <p className="text-sm text-gray-500">Loading plans...</p>}
        {!loading && plans.length === 0 && (
          <p className="text-sm text-gray-500">No therapy plans yet.</p>
        )}
        {plans.map((plan) => (
          <Card key={plan.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg">{plan.patientName}</CardTitle>
                    <Badge className={getStatusColor(plan.status)}>
                      {plan.status === "changes-requested"
                        ? "Changes Requested"
                        : plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Therapist: {plan.therapist}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-gray-700">Goal</Label>
                <p className="text-sm mt-1">{plan.goal}</p>
              </div>

              <div>
                <Label className="text-gray-700">Activities</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {plan.activities.map((activity) => (
                    <Badge key={activity} variant="outline" className="py-1.5">
                      {activity}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-gray-700">Duration</Label>
                <p className="text-sm mt-1">{plan.duration} sessions</p>
              </div>

              {plan.supervisorComment && (
                <>
                  <Separator />
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 text-red-600 mt-0.5" />
                      <div>
                        <Label className="text-red-900">Supervisor Feedback</Label>
                        <p className="text-sm text-red-800 mt-1">{plan.supervisorComment}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Supervisor Actions */}
              {role === "supervisor" && plan.status === "pending" && (
                <>
                  <Separator />
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <Label className="text-gray-700 mb-2 block">Supervisor Review</Label>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleApprovePlan(plan.id)}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        onClick={() =>
                          handleRequestChanges(
                            plan.id,
                            "Please provide more specific success criteria."
                          )
                        }
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Request Changes
                      </Button>
                      <Button size="sm" variant="outline">
                        <MessageSquare className="w-4 h-4 mr-1" />
                        Add Comment
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
