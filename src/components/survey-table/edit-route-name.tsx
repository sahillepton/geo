import { Loader2, SquarePen } from "lucide-react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const EditRouteName = ({
  routeName,
  surveyId,
}: {
  routeName: string;
  surveyId: string;
}) => {
  const [newRouteName, setNewRouteName] = useState(routeName);
  const queryClient = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationKey: ["edit-route-name"],
    mutationFn: async () => {
      const { error } = await supabase
        .from("surveys")
        .update({ name: newRouteName.trim() })
        .eq("id", surveyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["videos"] });
      toast.success("Route name updated successfully");
    },
    onError: () => {
      toast.error("Failed to update route name");
    },
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="cursor-pointer hidden group-hover:flex rounded-sm hover:bg-[#eed7fc] p-1">
          <SquarePen size={14} />
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Route Name</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="route-name">Route Name</Label>
            <Input
              id="route-name"
              value={newRouteName}
              onChange={(e) => setNewRouteName(e.target.value)}
              placeholder="Enter new route name"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button onClick={() => mutate()}>
            {isPending ? <Loader2 size={16} /> : "Update Route Name"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditRouteName;
