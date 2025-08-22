"use client";
import { useEffect, useMemo, useState } from "react";
import { DataTable } from "./data-table";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import {
  ChevronDownIcon,
  EditIcon,
  MailIcon,
  SearchIcon,
  TrashIcon,
  UserIcon,
  UsersIcon,
  SettingsIcon,
} from "lucide-react";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Button } from "../ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Input } from "../ui/input";
import {
  Command,
  CommandSeparator,
  CommandItem,
  CommandGroup,
  CommandEmpty,
  CommandList,
} from "../ui/command";
import { CommandInput } from "../ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Label } from "../ui/label";
import { ArrowLeftIcon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Define some color pairs for avatars
const avatarColors = [
  { bg: "bg-green-200", text: "text-green-800" },
  { bg: "bg-blue-200", text: "text-blue-800" },
  { bg: "bg-red-200", text: "text-red-800" },
  { bg: "bg-yellow-200", text: "text-yellow-800" },
  { bg: "bg-purple-200", text: "text-purple-800" },
  { bg: "bg-pink-200", text: "text-pink-800" },
  { bg: "bg-indigo-200", text: "text-indigo-800" },
];

const getRandomAvatarColor = () => {
  const randomIndex = Math.floor(Math.random() * avatarColors.length);
  return avatarColors[randomIndex];
};

export default function UserTable({ currentUser }: { currentUser: any }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [deletingUser, setDeletingUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "",
    location: "",
    manager_id: "",
  });

  // Fetch all users data
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const userRole = currentUser.role?.toLowerCase();
      if (userRole === "admin") {
        const { data: allUserData, error: allUserError } = await supabase
          .from("users")
          .select("*");

        if (allUserError) throw allUserError;

        return {
          users: allUserData || [],
          allUsers: allUserData || [],
        };
      }

      let userQuery = supabase.from("users").select("*");

      if (userRole === "manager" && currentUser.user_id) {
        userQuery = userQuery.or(
          `manager_id.eq.${currentUser.user_id},user_id.eq.${currentUser.user_id}`
        );

        const { data: userData, error } = await userQuery;

        if (error) throw error;

        const { data: allUserData } = await supabase
          .from("users")
          .select("user_id,username,role");

        return {
          users: userData || [],
          allUsers: allUserData || [],
        };
      }
    },
  });

  console.log(data, "management");

  // Client-side filtering and pagination
  const filteredUsers = useMemo(() => {
    if (!data?.users) return [];

    let filtered = [...data.users];

    // Apply search filter
    if (search) {
      filtered = filtered.filter(
        (user) =>
          user.username?.toLowerCase().includes(search.toLowerCase()) ||
          user.email?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply role filter
    if (selectedRole) {
      filtered = filtered.filter((user) => user.role === selectedRole);
    }

    return filtered;
  }, [data?.users, search, selectedRole]);

  // Apply pagination
  const paginatedUsers = useMemo(() => {
    const startIndex = (page - 1) * 10;
    const endIndex = startIndex + 10;
    return filteredUsers.slice(startIndex, endIndex);
  }, [filteredUsers, page]);

  const totalPages = Math.ceil(filteredUsers.length / 10);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, selectedRole]);

  const handleRoleChange = (value: string) => {
    setSelectedRole(value);
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setFormData({
      username: user.username || "",
      email: user.email || "",
      password: "",
      role: user.role || "",
      location: user.location || "",
      manager_id: user.manager_id || "no-manager",
    });
    setShowEditModal(true);
  };

  const handleDeleteUser = (user: any) => {
    setDeletingUser(user);
    setShowDeleteModal(true);
  };

  const handleAddUser = () => {
    setFormData({
      username: "",
      email: "",
      password: "",
      role: "",
      location: "",
      manager_id: "no-manager",
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({
      username: "",
      email: "",
      password: "",
      role: "",
      location: "",
      manager_id: "no-manager",
    });
    setEditingUser(null);
    setDeletingUser(null);
  };

  const closeModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    resetForm();
  };

  const handleSubmit = async (values: any) => {
    try {
      console.log(values, "values");
      const isAdmin = currentUser.role?.toLowerCase() === "admin";
      const isManager = currentUser.role?.toLowerCase() === "manager";

      if (isManager) {
        values.role = "surveyor";
        values.manager_id = currentUser.user_id;
      }

      if (!editingUser) {
        // Create new user
        const { data, error } = await supabase
          .from("users")
          .insert([
            {
              username: values.username,
              email: values.email,
              password: values.password,
              role: values.role,
              location: values.location,
              manager_id:
                values.manager_id === "no-manager" ? null : values.manager_id,
            },
          ])
          .select();

        if (error) throw error;

        toast.success("User created successfully");
        queryClient.invalidateQueries({ queryKey: ["users"] });
      } else {
        // Update existing user
        const updateData: any = {
          username: values.username,
          email: values.email,
          location: values.location,
        };

        if (isAdmin) {
          updateData.role = values.role;
          updateData.manager_id =
            values.manager_id === "no-manager" ? null : values.manager_id;
        }

        if (values.password) {
          updateData.password = values.password;
        }

        const { error } = await supabase
          .from("users")
          .update(updateData)
          .eq("user_id", editingUser.user_id);

        if (error) throw error;

        toast.success("User updated successfully");
        queryClient.invalidateQueries({ queryKey: ["users"] });
      }

      closeModals();
    } catch (error: any) {
      console.error("Error saving user:", error);
      toast.error("Failed to save user: " + error.message);
    }
  };

  const handleDeleteSubmit = async () => {
    try {
      if (!deletingUser) return;

      const { error } = await supabase
        .from("users")
        .delete()
        .eq("user_id", deletingUser.user_id);

      if (error) throw error;

      toast.success("User deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      closeModals();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user: " + error.message);
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 3) {
        pages.push(1, 2, 3, 4, "...");
      } else if (page >= totalPages - 2) {
        pages.push(
          1,
          "...",
          totalPages - 3,
          totalPages - 2,
          totalPages - 1,
          totalPages
        );
      } else {
        pages.push(1, "...", page - 1, page, page + 1, "...", totalPages);
      }
    }
    return pages;
  };

  const handlePageClick = (e: React.MouseEvent, pageNum: number | string) => {
    e.preventDefault();
    if (typeof pageNum === "number") setPage(pageNum);
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "username",
      header: () => (
        <div className="flex items-center gap-1 justify-center">
          <UserIcon size={16} />
          <span>USERNAME</span>
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-1 justify-center">
          <UserIcon size={14} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-900">
            {row.original.username}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "email",
      header: () => (
        <div className="flex items-center gap-1 justify-center">
          <MailIcon size={16} />
          <span>EMAIL</span>
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-1 justify-center">
          <MailIcon size={14} className="text-gray-500" />
          <span className="text-sm text-gray-700">{row.original.email}</span>
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: () => (
        <div className="flex items-center gap-1 justify-center">
          <UserIcon size={16} />
          <span>ROLE</span>
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-1 justify-center">
          <UserIcon size={14} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-900">
            {row.original.role}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "manager",
      header: () => (
        <div className="flex items-center gap-1 justify-center">
          <UsersIcon size={16} />
          <span>MANAGER</span>
        </div>
      ),
      cell: ({ row }) => {
        const manager = data?.allUsers?.find(
          (user: any) => user.user_id === row.original.manager_id
        );
        return (
          <div className="flex items-center justify-center">
            {manager ? (
              <span className="text-sm text-gray-700">{manager.username}</span>
            ) : (
              <span className="text-sm text-gray-400">-</span>
            )}
          </div>
        );
      },
    },
    // Only show actions column for admin users
    ...(currentUser.role?.toLowerCase() === "admin"
      ? [
          {
            accessorKey: "actions",
            header: () => (
              <div className="flex items-center gap-1 justify-center">
                <SettingsIcon size={16} />
                <span>ACTIONS</span>
              </div>
            ),
            cell: ({ row }) => (
              <div className="flex items-center gap-2 justify-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditUser(row.original)}
                      className="h-8 w-8 p-0 hover:bg-blue-50"
                    >
                      <EditIcon size={16} className="text-blue-600" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Edit user</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteUser(row.original)}
                      className="h-8 w-8 p-0 hover:bg-red-50"
                    >
                      <TrashIcon size={16} className="text-red-600" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Delete user</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            ),
          },
        ]
      : []),
  ];

  // Get unique roles from the data
  const roles = useMemo(() => {
    if (!data?.users) return [];
    return [...new Set(data.users.map((user) => user.role).filter(Boolean))];
  }, [data?.users]);

  return (
    <div className="container py-10 max-w-[1050px] mx-auto">
      <div className="mb-4 w-full flex justify-between items-center">
        <div className="flex items-center gap-2 border rounded-md w-64 h-8 p-2">
          <SearchIcon size={16} />
          <Input
            type="search"
            placeholder="Search for username or email"
            className="border-none ring-none shadow-none focus:border-none focus:ring-none focus-visible:ring-0 focus-visible:ring-offset-0"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-[100px] justify-between font-normal text-xs h-8 p-1"
              >
                <span className="truncate flex-1 text-left">
                  {selectedRole || "Role"}
                </span>
                <ChevronDownIcon className="h-3 w-3 flex-shrink-0 ml-1" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[180px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search roles..." />
                <CommandList>
                  <CommandEmpty>No role found.</CommandEmpty>
                  {roles.map((role, idx) => (
                    <CommandItem
                      key={idx}
                      value={role}
                      onSelect={() => handleRoleChange(role)}
                    >
                      {role}
                    </CommandItem>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <Button
            onClick={handleAddUser}
            className="flex items-center gap-2 h-8"
          >
            <PlusIcon size={16} />
            Add User
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={paginatedUsers}
        isFetching={isLoading}
      />

      <div className="flex items-center space-x-2 py-4 mt-4">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setPage((prev) => Math.max(prev - 1, 1));
                }}
              />
            </PaginationItem>

            {getPageNumbers().map((num, idx) => (
              <PaginationItem key={idx}>
                {num === "..." ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink
                    isActive={num === page}
                    href="#"
                    onClick={(e) => handlePageClick(e, num)}
                  >
                    {num}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}

            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setPage((prev) => Math.min(prev + 1, totalPages));
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      {/* Add User Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                placeholder="Enter username"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="Enter email"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="Enter password"
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="surveyor">Surveyor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                placeholder="Enter location"
              />
            </div>
            <div>
              <Label htmlFor="manager">Manager</Label>
              <Select
                value={formData.manager_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, manager_id: value })
                }
              >
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
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModals}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                handleSubmit(formData);
              }}
            >
              Add User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-username">Username</Label>
              <Input
                id="edit-username"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                placeholder="Enter username"
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="Enter email"
              />
            </div>
            <div>
              <Label htmlFor="edit-password">
                Password (leave blank to keep current)
              </Label>
              <Input
                id="edit-password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="Enter new password"
              />
            </div>
            <div>
              <Label htmlFor="edit-role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="surveyor">Surveyor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-location">Location</Label>
              <Input
                id="edit-location"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                placeholder="Enter location"
              />
            </div>
            <div>
              <Label htmlFor="edit-manager">Manager</Label>
              <Select
                value={formData.manager_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, manager_id: value })
                }
              >
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
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModals}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                handleSubmit(formData);
              }}
            >
              Update User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
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
            <Button variant="outline" onClick={closeModals}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                handleDeleteSubmit();
              }}
            >
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
