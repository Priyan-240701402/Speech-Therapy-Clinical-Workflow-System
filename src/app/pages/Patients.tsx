import { useEffect, useState } from "react";
import { useAuth, useRole } from "../auth/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { UserPlus, Search } from "lucide-react";
import { Input } from "../components/ui/input";

interface Patient {
  id: number;
  name: string;
  age: number;
  diagnosis: string;
  assignedTherapist: string;
  status: "active" | "pending" | "completed";
}

export default function Patients() {
  const role = useRole();
  const { token } = useAuth();
  const API_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:4000";

  const [searchTerm, setSearchTerm] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: "", age: "", diagnosis: "" });
  const [error, setError] = useState("");

  const [therapists, setTherapists] = useState<
    Array<{ id: number; username: string; displayName?: string }>
  >([]);
  const therapistNameByUsername = new Map(
    therapists.map((therapist) => [therapist.username, therapist.displayName])
  );

  useEffect(() => {
    const fetchPatients = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_URL}/patients`, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || "Failed to load patients");
        }

        const data = await res.json();
        setPatients(data.patients || []);

        if (role === "admin" || role === "supervisor") {
          const therapistsRes = await fetch(`${API_URL}/therapists`, {
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          });
          if (therapistsRes.ok) {
            const therapistsData = await therapistsRes.json();
            setTherapists(therapistsData.therapists || []);
          }
        }

        setError("");
      } catch (err) {
        setError((err as Error).message || "Unable to fetch patients");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatients();
  }, [API_URL, role, token]);

  const handleAddPatient = async () => {
    if (!newPatient.name.trim() || !newPatient.age || !newPatient.diagnosis.trim()) {
      setError("Name, age, and diagnosis are required");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/patients`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: newPatient.name.trim(),
          age: Number(newPatient.age),
          diagnosis: newPatient.diagnosis.trim(),
          assignedTherapist: "Unassigned",
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to add patient");
      }

      const data = await res.json();
      if (data.patient) {
        setPatients((prev) => [...prev, data.patient]);
        setNewPatient({ name: "", age: "", diagnosis: "" });
        setAddDialogOpen(false);
        setError("");
      }
    } catch (err) {
      setError((err as Error).message || "Unable to add patient");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignTherapist = async (patientId: number, therapist: string) => {
    const updatedStatus = therapist === "Unassigned" ? "pending" as const : "active" as const;
    const optimisticPatients = patients.map((p) =>
      p.id === patientId
        ? { ...p, assignedTherapist: therapist, status: updatedStatus }
        : p
    );
    setPatients(optimisticPatients);

    try {
      const res = await fetch(`${API_URL}/patients/${patientId}/assign`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ assignedTherapist: therapist }),
      });

      if (!res.ok) {
        throw new Error("Failed to persist therapist assignment");
      }

      const data = await res.json();
      setPatients((prev) =>
        prev.map((p) => (p.id === patientId ? data.patient : p))
      );
      setError("");
    } catch (err) {
      setError((err as Error).message || "Unable to assign therapist");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredPatients = patients.filter((patient) =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.diagnosis.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Patient Allocation</h2>
          <p className="text-gray-600 mt-1">Manage patient assignments and track status</p>
        </div>
        {(role === "admin" || role === "supervisor") && (
          <>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => setAddDialogOpen(true)}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add New Patient
            </Button>

            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Patient</DialogTitle>
                  <DialogDescription>
                    Enter patient details to create a new record in the system.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <Input
                      value={newPatient.name}
                      onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                      placeholder="Patient name"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Age</label>
                    <Input
                      type="number"
                      min={1}
                      value={newPatient.age}
                      onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })}
                      placeholder="Patient age"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Diagnosis</label>
                    <Input
                      value={newPatient.diagnosis}
                      onChange={(e) => setNewPatient({ ...newPatient, diagnosis: e.target.value })}
                      placeholder="Diagnosis"
                      className="mt-1"
                    />
                  </div>
                </div>

                {error && <p className="text-sm text-red-600 mt-1">{error}</p>}

                <DialogFooter>
                  <button
                    onClick={() => setAddDialogOpen(false)}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <Button
                    onClick={handleAddPatient}
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isLoading ? "Saving..." : "Save Patient"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search patients by name or diagnosis..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="text-sm text-gray-600">
          Loading patients... Please wait.
        </div>
      )}

      {/* Patient Table */}
      <Card>
        <CardHeader>
          <CardTitle>Patient List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Diagnosis</TableHead>
                  <TableHead>Assigned Therapist</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell className="font-medium">{patient.name}</TableCell>
                    <TableCell>{patient.age}</TableCell>
                    <TableCell>{patient.diagnosis}</TableCell>
                    <TableCell>
                      {patient.assignedTherapist === "Unassigned" ? (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          Unassigned
                        </Badge>
                      ) : (
                        therapistNameByUsername.get(patient.assignedTherapist) ??
                        patient.assignedTherapist
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(patient.status)}>
                        {patient.status.charAt(0).toUpperCase() + patient.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {(role === "admin" || role === "supervisor") && (
                        <Select
                          value={
                            patient.assignedTherapist !== "Unassigned"
                              ? patient.assignedTherapist
                              : ""
                          }
                          onValueChange={(value) => handleAssignTherapist(patient.id, value)}
                        >
                          <SelectTrigger className="w-40 ml-auto">
                            <SelectValue placeholder="Assign Therapist" />
                          </SelectTrigger>
                          <SelectContent>
                            {therapists.map((therapist) => (
                              <SelectItem key={therapist.id} value={therapist.username}>
                                {therapist.displayName || therapist.username}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {role === "therapist" && (
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">{patients.length}</p>
              <p className="text-sm text-gray-600 mt-1">Total Patients</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">
                {patients.filter((p) => p.status === "active").length}
              </p>
              <p className="text-sm text-gray-600 mt-1">Active Cases</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-600">
                {patients.filter((p) => p.assignedTherapist === "Unassigned").length}
              </p>
              <p className="text-sm text-gray-600 mt-1">Awaiting Assignment</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
