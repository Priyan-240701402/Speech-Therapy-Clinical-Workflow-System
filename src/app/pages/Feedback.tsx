import { useEffect, useState } from "react";
import { useAuth, useRole } from "../auth/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Star, Send, ThumbsUp } from "lucide-react";

interface FeedbackItem {
  id: number;
  therapistName: string;
  supervisorName: string;
  date: string;
  rating: number;
  strengths: string;
  areasForImprovement: string;
  overallComments: string;
  patientCase?: string;
}

export default function Feedback() {
  const role = useRole();
  const { token } = useAuth();
  const API_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:4000";
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedbackForm, setFeedbackForm] = useState({
    therapistName: "",
    strengths: "",
    areasForImprovement: "",
    overallComments: "",
  });

  const [feedbackHistory, setFeedbackHistory] = useState<FeedbackItem[]>([]);

  const formatDate = (value?: string) => {
    if (!value) return "—";
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
    const fetchFeedback = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/feedback`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || "Failed to load feedback");
        }
        const data = await res.json();
        if (!active) return;
        const mapped = (data.feedback || []).map((f: any) => ({
          id: f.id,
          therapistName: f.therapistName,
          supervisorName: f.supervisorName,
          date: formatDate(f.createdAt),
          rating: f.rating,
          strengths: f.strengths || "",
          areasForImprovement: f.areasForImprovement || "",
          overallComments: f.overallComments || "",
          patientCase: f.patientCase || "",
        })) as FeedbackItem[];
        setFeedbackHistory(mapped);
        setError("");
      } catch (err) {
        if (!active) return;
        setError((err as Error).message || "Unable to load feedback");
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchFeedback();
    return () => {
      active = false;
    };
  }, [API_URL, token]);

  const handleSubmitFeedback = async () => {
    if (selectedRating > 0 && feedbackForm.therapistName) {
      try {
        const res = await fetch(`${API_URL}/feedback`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...feedbackForm,
            supervisorName: "Dr. Sarah Anderson",
            rating: selectedRating,
          }),
        });
        if (!res.ok) throw new Error("Failed to submit feedback");
        const data = await res.json();
        setFeedbackHistory((prev) => [
          {
            id: data.feedback.id,
            therapistName: data.feedback.therapistName,
            supervisorName: data.feedback.supervisorName,
            date: formatDate(data.feedback.createdAt),
            rating: data.feedback.rating,
            strengths: data.feedback.strengths || "",
            areasForImprovement: data.feedback.areasForImprovement || "",
            overallComments: data.feedback.overallComments || "",
            patientCase: data.feedback.patientCase || "",
          },
          ...prev,
        ]);
        setFeedbackForm({
          therapistName: "",
          strengths: "",
          areasForImprovement: "",
          overallComments: "",
        });
        setSelectedRating(0);
        setError("");
      } catch (err) {
        setError((err as Error).message || "Unable to submit feedback");
      }
    }
  };

  const renderStars = (rating: number, interactive: boolean = false) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => interactive && setSelectedRating(star)}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            disabled={!interactive}
            className={`${interactive ? "cursor-pointer" : "cursor-default"}`}
          >
            <Star
              className={`w-6 h-6 ${
                star <= (interactive ? hoverRating || selectedRating : rating)
                  ? "fill-yellow-400 text-yellow-400"
                  : "fill-none text-gray-300"
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const getRatingText = (rating: number) => {
    switch (rating) {
      case 5:
        return { text: "Excellent", color: "text-green-600" };
      case 4:
        return { text: "Very Good", color: "text-blue-600" };
      case 3:
        return { text: "Good", color: "text-yellow-600" };
      case 2:
        return { text: "Needs Improvement", color: "text-orange-600" };
      case 1:
        return { text: "Poor", color: "text-red-600" };
      default:
        return { text: "Not Rated", color: "text-gray-600" };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Feedback & Rating</h2>
        <p className="text-gray-600 mt-1">Supervisor feedback and performance evaluation</p>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feedback Form (Supervisor Only) */}
        {role === "supervisor" && (
          <div className="lg:col-span-2">
            <Card className="border-2 border-blue-200">
              <CardHeader className="bg-blue-50">
                <CardTitle className="flex items-center gap-2">
                  <ThumbsUp className="w-5 h-5" />
                  Provide Therapist Feedback
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <Label htmlFor="therapistSelect">Therapist</Label>
                  <select
                    id="therapistSelect"
                    value={feedbackForm.therapistName}
                    onChange={(e) =>
                      setFeedbackForm({ ...feedbackForm, therapistName: e.target.value })
                    }
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select therapist</option>
                    <option value="Dr. Emily Roberts">Dr. Emily Roberts</option>
                    <option value="Dr. James Wilson">Dr. James Wilson</option>
                    <option value="Dr. Sarah Anderson">Dr. Sarah Anderson</option>
                    <option value="Dr. Michael Thompson">Dr. Michael Thompson</option>
                  </select>
                </div>

                <div>
                  <Label>Performance Rating</Label>
                  <div className="flex items-center gap-4 mt-2">
                    {renderStars(selectedRating, true)}
                    {selectedRating > 0 && (
                      <span className={`text-sm font-medium ${getRatingText(selectedRating).color}`}>
                        {getRatingText(selectedRating).text}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="strengths">Strengths & Positive Observations</Label>
                  <Textarea
                    id="strengths"
                    placeholder="Highlight specific strengths and positive behaviors observed..."
                    value={feedbackForm.strengths}
                    onChange={(e) =>
                      setFeedbackForm({ ...feedbackForm, strengths: e.target.value })
                    }
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="improvements">Areas for Improvement</Label>
                  <Textarea
                    id="improvements"
                    placeholder="Provide constructive feedback on areas that need development..."
                    value={feedbackForm.areasForImprovement}
                    onChange={(e) =>
                      setFeedbackForm({ ...feedbackForm, areasForImprovement: e.target.value })
                    }
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="overall">Overall Comments</Label>
                  <Textarea
                    id="overall"
                    placeholder="Additional comments or recommendations..."
                    value={feedbackForm.overallComments}
                    onChange={(e) =>
                      setFeedbackForm({ ...feedbackForm, overallComments: e.target.value })
                    }
                    rows={3}
                  />
                </div>

                <Button
                  onClick={handleSubmitFeedback}
                  disabled={!feedbackForm.therapistName || selectedRating === 0}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Submit Feedback
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Feedback History */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Feedback History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading && <p className="text-sm text-gray-500">Loading feedback...</p>}
              {!loading && feedbackHistory.length === 0 && (
                <p className="text-sm text-gray-500">No feedback yet.</p>
              )}
              {feedbackHistory.map((feedback) => {
                const ratingInfo = getRatingText(feedback.rating);
                return (
                  <div
                    key={feedback.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">{feedback.therapistName}</h4>
                        <p className="text-sm text-gray-600">
                          Reviewed by {feedback.supervisorName} on {feedback.date}
                        </p>
                        {feedback.patientCase && (
                          <p className="text-xs text-gray-500 mt-1">
                            Related to: {feedback.patientCase}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {renderStars(feedback.rating)}
                        <Badge className={`${ratingInfo.color} bg-transparent border-0`}>
                          {ratingInfo.text}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <Label className="text-green-900 text-xs font-semibold">
                          Strengths
                        </Label>
                        <p className="text-sm text-gray-700 mt-1">{feedback.strengths}</p>
                      </div>

                      {feedback.areasForImprovement && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <Label className="text-yellow-900 text-xs font-semibold">
                            Areas for Growth
                          </Label>
                          <p className="text-sm text-gray-700 mt-1">
                            {feedback.areasForImprovement}
                          </p>
                        </div>
                      )}

                      {feedback.overallComments && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <Label className="text-blue-900 text-xs font-semibold">
                            Overall Comments
                          </Label>
                          <p className="text-sm text-gray-700 mt-1">
                            {feedback.overallComments}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Summary Stats */}
        {role === "therapist" && (
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-900">
                      {feedbackHistory.length}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">Total Reviews</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-3xl font-bold text-yellow-600">
                        {feedbackHistory.length
                          ? (
                              feedbackHistory.reduce((sum, f) => sum + f.rating, 0) /
                              feedbackHistory.length
                            ).toFixed(1)
                          : "0.0"}
                      </p>
                      <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Average Rating</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-600">
                      {feedbackHistory.filter((f) => f.rating >= 4).length}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">Positive Reviews</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
