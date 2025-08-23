import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { deleteUser } from "./action";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const DeleteUserModal = ({
  showDeleteModal,
  setShowDeleteModal,
  deletingUser,
  setDeletingUser,
}: {
  showDeleteModal: boolean;
  setShowDeleteModal: (show: boolean) => void;
  deletingUser: any;
  setDeletingUser: (user: any) => void;
}) => {
  // console.log(deletingUser, "deletingUser");
  const queryClient = useQueryClient();
  return (
    <Dialog
      open={showDeleteModal}
      onOpenChange={(open) => {
        if (!open) {
          setShowDeleteModal(false);
          setDeletingUser(null);
        }
      }}
    >
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
          <Button
            variant="outline"
            onClick={() => {
              setShowDeleteModal(false);
              setDeletingUser(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              const { error } = await deleteUser(deletingUser.user_id);
              if (error) {
                toast.error(error);
              } else {
                toast.success("User deleted successfully");
                setShowDeleteModal(false);
                setDeletingUser(null);
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
