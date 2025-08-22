import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Button } from "../ui/button";
import { DialogFooter } from "../ui/dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addUser } from "./action";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useActionState, useEffect } from "react";

const AddUserModal = ({
  showAddModal,
  setShowAddModal,
  currentUser,
  data,
}: {
  showAddModal: boolean;
  setShowAddModal: (show: boolean) => void;
  currentUser: any;
  data: any;
}) => {
  const [state, formAction, isPending] = useActionState(addUser, null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (state?.message) {
      toast.success(state.message);
      queryClient.invalidateQueries({ queryKey: ["users-management"] });
      setShowAddModal(false);
    }
  }, [state?.message, queryClient, setShowAddModal]);

  return (
    <Dialog
      open={showAddModal}
      onOpenChange={(open) => {
        if (!open) {
          setShowAddModal(false);
        }
      }}
    >
      <DialogContent className="max-w-lg rounded-lg shadow-lg p-6 bg-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-800">
            Add New User
          </DialogTitle>
        </DialogHeader>

        <form action={formAction}>
          <div className="grid grid-cols-1 gap-4 mt-4">
            {/* Username */}
            <div className="flex flex-col">
              <Label
                htmlFor="username"
                className="mb-1 text-gray-700 font-medium"
              >
                Username
              </Label>
              <Input
                id="username"
                name="username"
                placeholder="Enter username"
                className="border-gray-300 focus:ring-2 focus:ring-blue-400"
              />
              {state?.errors?.username && (
                <p className="text-red-500 text-sm">{state.errors.username}</p>
              )}
            </div>

            {/* Email */}
            <div className="flex flex-col">
              <Label htmlFor="email" className="mb-1 text-gray-700 font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                name="email"
                placeholder="Enter email"
                className="border-gray-300 focus:ring-2 focus:ring-blue-400"
              />
              {state?.errors?.email && (
                <p className="text-red-500 text-sm">{state.errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="flex flex-col">
              <Label
                htmlFor="password"
                className="mb-1 text-gray-700 font-medium"
              >
                Password
              </Label>
              <Input
                id="password"
                type="password"
                name="password"
                placeholder="Enter password"
                className="border-gray-300 focus:ring-2 focus:ring-blue-400"
              />
              {state?.errors?.password && (
                <p className="text-red-500 text-sm">{state.errors.password}</p>
              )}
            </div>

            {/* Role & Manager (grouped side by side if screen allows) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col">
                <Label
                  htmlFor="role"
                  className="mb-1 text-gray-700 font-medium"
                >
                  Role
                </Label>
                <Select name="role">
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentUser.role?.toLowerCase() === "admin" && (
                      <>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                      </>
                    )}

                    <SelectItem value="surveyor">Surveyor</SelectItem>
                  </SelectContent>
                </Select>
                {state?.errors?.role && (
                  <p className="text-red-500 text-sm">{state.errors.role}</p>
                )}
              </div>

              {currentUser.role?.toLowerCase() === "admin" && (
                <div className="flex flex-col">
                  <Label
                    htmlFor="manager"
                    className="mb-1 text-gray-700 font-medium"
                  >
                    Manager
                  </Label>
                  <Select name="manager_id">
                    <SelectTrigger>
                      <SelectValue placeholder="Select manager (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no-manager">No Manager</SelectItem>
                      {data?.allUsers
                        ?.filter((user: any) => user.role === "manager")
                        .map((user: any) => (
                          <SelectItem key={user.user_id} value={user.user_id}>
                            {user.username}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {state?.errors?.manager_id && (
                    <p className="text-red-500 text-sm">
                      {state.errors.manager_id}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Location */}
            <div className="flex flex-col">
              <Label
                htmlFor="location"
                className="mb-1 text-gray-700 font-medium"
              >
                Location
              </Label>
              <Input
                id="location"
                name="location"
                placeholder="Enter location"
                className="border-gray-300 focus:ring-2 focus:ring-blue-400"
              />
              {state?.errors?.location && (
                <p className="text-red-500 text-sm">{state.errors.location}</p>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : "Add User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddUserModal;
