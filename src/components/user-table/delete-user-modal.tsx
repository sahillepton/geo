import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { deleteUser } from "./action";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { TrashIcon } from "lucide-react";

const DeleteUserModal = ({ deletingUser }: { deletingUser: any }) => {
  const queryClient = useQueryClient();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <TrashIcon size={16} className="text-red-600" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete User</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete user{" "}
            <strong>{deletingUser?.username}</strong>? This action cannot be
            undone.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button
            variant="destructive"
            onClick={async () => {
              const { error } = await deleteUser(deletingUser.user_id);
              if (error) {
                toast.error(error);
              } else {
                toast.success("User deleted successfully");
                queryClient.invalidateQueries({
                  queryKey: ["users-management"],
                });
              }
            }}
          >
            Delete User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteUserModal;
