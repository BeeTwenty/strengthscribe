
import { useState } from "react";
import { WorkoutCard } from "@/components/WorkoutCard";
import { WorkoutStats } from "@/components/WorkoutStats";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CreateWorkoutDialog } from "@/components/CreateWorkoutDialog";
import { WorkoutPlayer } from "@/components/WorkoutPlayer";

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeWorkoutId, setActiveWorkoutId] = useState<string | null>(null);

  // Fetch user profile
  const { data: profile } = useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, username")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return {
        fullName: data.full_name,
        username: data.username,
        email: user.email
      };
    },
  });

  const { data: routines, isLoading } = useQuery({
    queryKey: ["routines"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      const { data: workouts, error } = await supabase
        .from("workouts")
        .select(`
          id,
          title,
          exercises (count)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return workouts.map(workout => ({
        id: workout.id,
        title: workout.title,
        exercises: workout.exercises[0].count,
      }));
    },
  });

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate("/auth");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error signing out",
        description: error.message,
      });
    }
  };

  const handleDeleteWorkout = async (id: string) => {
    try {
      const { error } = await supabase
        .from("workouts")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Routine deleted",
        description: "Your routine has been deleted successfully."
      });

      // Refresh the routines data
      queryClient.invalidateQueries({ queryKey: ["routines"] });
      queryClient.invalidateQueries({ queryKey: ["workoutStats"] });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error deleting routine",
        description: error.message,
      });
    }
  };

  // Get the display name from profile
  const displayName = profile?.fullName || profile?.username || profile?.email?.split('@')[0] || "there";

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="container py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in">
          <div>
            <h1 className="text-4xl font-bold">Welcome back, {displayName}</h1>
            <p className="text-gray-500 mt-2">Track your fitness journey</p>
          </div>
          <div className="flex gap-2">
            <CreateWorkoutDialog />
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Stats Section */}
        <section className="py-4">
          <WorkoutStats />
        </section>

        {/* Routines Section */}
        <section className="py-4">
          <h2 className="text-2xl font-semibold mb-4">Routines</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-lg" />
              ))
            ) : routines?.length ? (
              routines.map((routine) => (
                <WorkoutCard
                  key={routine.id}
                  title={routine.title}
                  duration=""
                  exercises={routine.exercises}
                  onClick={() => setActiveWorkoutId(routine.id)}
                  onDelete={() => handleDeleteWorkout(routine.id)}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-gray-500">
                No routines yet. Start by creating your first workout routine!
              </div>
            )}
          </div>
        </section>

        {/* Workout Player */}
        <WorkoutPlayer 
          workoutId={activeWorkoutId} 
          onClose={() => setActiveWorkoutId(null)} 
        />
      </div>
    </div>
  );
};

export default Index;
