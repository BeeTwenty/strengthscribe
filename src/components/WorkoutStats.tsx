
import { Card } from "@/components/ui/card";
import { Activity, Timer } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { startOfWeek } from "date-fns";

type CompletedWorkout = {
  id: string;
  workout_id: string;
  duration: number;
  completed_at: string;
};

export function WorkoutStats() {
  // Fetch user profile and workout stats
  const { data: userStats } = useQuery({
    queryKey: ["workoutStats"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      // Get user profile to fetch goals
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("workout_goal, hour_goal")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      const now = new Date();
      // Start week on Monday (1), not Sunday (0)
      const mondayOfThisWeek = startOfWeek(now, { weekStartsOn: 1 });
      const startOfWeekISO = mondayOfThisWeek.toISOString();

      // Get completed workouts this week
      const { data: completedWorkouts, error: completedError } = await supabase
        .rpc('get_completed_workouts_since', { start_date: startOfWeekISO });

      if (completedError) throw completedError;

      const totalWorkouts = completedWorkouts?.length || 0;
      // Calculate total hours from minutes and round to whole number
      const totalHours = completedWorkouts ? 
        Math.round(completedWorkouts.reduce((acc: number, curr: CompletedWorkout) => acc + (curr.duration / 60), 0)) : 0;

      return {
        totalWorkouts,
        totalHours,
        workoutGoal: profile?.workout_goal || 5,
        hourGoal: profile?.hour_goal || 10,
      };
    },
  });

  const workoutGoal = userStats?.workoutGoal || 5;
  const hourGoal = userStats?.hourGoal || 10;
  
  const workoutProgress = Math.min(((userStats?.totalWorkouts || 0) / workoutGoal) * 100, 100);
  const workoutsRemaining = Math.max(workoutGoal - (userStats?.totalWorkouts || 0), 0);

  const hourProgress = Math.min(((userStats?.totalHours || 0) / hourGoal) * 100, 100);
  const hoursRemaining = Math.max(hourGoal - (userStats?.totalHours || 0), 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="p-6 w-full">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-100 rounded-full">
            <Activity className="w-6 h-6 text-red-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-500">Workouts This Week</p>
            <h4 className="text-2xl font-semibold">{userStats?.totalWorkouts ?? "0"} / {workoutGoal}</h4>
            <Progress value={workoutProgress} className="h-2 mt-2" />
            <p className="text-xs text-gray-500 mt-1">
              {workoutsRemaining > 0 ? `${workoutsRemaining} workouts remaining` : `Goal reached!`}
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6 w-full">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gray-100 rounded-full">
            <Timer className="w-6 h-6 text-gray-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-500">Hours This Week</p>
            <h4 className="text-2xl font-semibold">{userStats?.totalHours ?? "0"} / {hourGoal}</h4>
            <Progress value={hourProgress} className="h-2 mt-2" />
            <p className="text-xs text-gray-500 mt-1">
              {hoursRemaining > 0 ? `${hoursRemaining} hours remaining` : `Goal reached!`}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
