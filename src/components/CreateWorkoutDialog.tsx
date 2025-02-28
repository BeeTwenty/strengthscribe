
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExerciseTemplateCard } from "./ExerciseTemplateCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Dumbbell, Search } from "lucide-react";

interface ExerciseTemplate {
  id: string;
  name: string;
  description: string;
  media_url: string;
  target_muscle: string;
}

interface SelectedExercise extends ExerciseTemplate {
  sets: number;
  reps: number;
  weight: number | null;
}

export function CreateWorkoutDialog() {
  const [title, setTitle] = useState("");
  const { toast } = useToast();
  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([]);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: exerciseTemplates, isLoading } = useQuery({
    queryKey: ["exerciseTemplates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercise_templates")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as ExerciseTemplate[];
    },
  });

  const filteredExercises = exerciseTemplates?.filter(exercise => {
    if (!searchQuery) return false; // Don't show anything if no search
    
    const lowerCaseSearch = searchQuery.toLowerCase();
    return (
      exercise.name.toLowerCase().includes(lowerCaseSearch) ||
      exercise.target_muscle.toLowerCase().includes(lowerCaseSearch) ||
      exercise.description.toLowerCase().includes(lowerCaseSearch)
    );
  });

  const handleCreateWorkout = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      // Create workout
      const { data: workout, error: workoutError } = await supabase
        .from("workouts")
        .insert({
          title,
          user_id: user.id,
          duration: 0, // This will be updated as exercises are completed
        })
        .select()
        .single();

      if (workoutError) throw workoutError;

      // Add exercises to workout with customized sets, reps, and weight
      const exercisesData = selectedExercises.map(exercise => ({
        workout_id: workout.id,
        name: exercise.name,
        sets: exercise.sets,
        reps: exercise.reps,
        weight: exercise.weight,
        notes: exercise.description,
      }));

      const { error: exercisesError } = await supabase
        .from("exercises")
        .insert(exercisesData);

      if (exercisesError) throw exercisesError;

      toast({
        title: "Routine created",
        description: "Your new workout routine has been created successfully.",
      });

      setTitle("");
      setSelectedExercises([]);
      setSearchQuery("");
      setOpen(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error creating routine",
        description: error.message,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-accent hover:bg-accent/90">
          <Dumbbell className="mr-2 h-4 w-4" />
          New Routine
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Routine</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div>
            <Input
              placeholder="Routine Title (e.g., Upper Body, Leg Day)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          
          {selectedExercises.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">Selected Exercises</h3>
              <div className="space-y-2">
                {selectedExercises.map((exercise) => (
                  <div key={exercise.id} className="flex justify-between items-center p-3 bg-muted rounded-md">
                    <div>
                      <span className="font-medium">{exercise.name}</span>
                      <div className="text-sm text-muted-foreground">
                        {exercise.sets} sets × {exercise.reps} reps
                        {exercise.weight ? ` × ${exercise.weight}kg` : ''}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedExercises(prev => prev.filter(e => e.id !== exercise.id))}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="font-medium">Search For Exercises</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by name, muscle group, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : searchQuery ? (
              filteredExercises && filteredExercises.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {filteredExercises.map((template) => (
                    <ExerciseTemplateCard
                      key={template.id}
                      name={template.name}
                      description={template.description}
                      mediaUrl={template.media_url}
                      targetMuscle={template.target_muscle}
                      onAdd={(sets, reps, weight) => {
                        if (!selectedExercises.find(e => e.id === template.id)) {
                          setSelectedExercises(prev => [...prev, {
                            ...template,
                            sets,
                            reps,
                            weight
                          }]);
                        }
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 mt-4">
                  No exercises found matching "{searchQuery}". Try a different search.
                </div>
              )
            ) : (
              <div className="text-center py-8 text-gray-500 mt-4">
                Enter a search term to find exercises
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateWorkout}
              disabled={!title || selectedExercises.length === 0}
            >
              Create Routine
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
