//@ts-nocheck
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
import AddUserModal from "./add-user-modal";
import EditUserModel from "./edit-user-model";
import DeleteUserModal from "./delete-user-modal";

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
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState("");

  // Fetch all users data
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["users-management"],
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
    // Only show actions column for admin users
    ...(currentUser.role?.toLowerCase() === "admin" ||
    currentUser.role?.toLowerCase() === "manager"
      ? [
          {
            accessorKey: "action",
            header: "",
            cell: ({ row }) => {
              return (
                <div className="flex items-center gap-1">
                  <EditUserModel
                    currentUser={currentUser}
                    data={data}
                    user={row.original}
                  />
                  <DeleteUserModal deletingUser={row.original} />
                </div>
              );
            },
          },
        ]
      : []),
    {
      accessorKey: "username",
      header: "Username",
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <span
            title={row.original.username}
            className="w-20 text-center text-xs font-semibold truncate rounded px-1 py-0.5 text-[#11181c] dark:text-white"
          >
            {row.original.username?.length > 20
              ? row.original.username.slice(0, 20) + "..."
              : row.original.username}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <span
            title={row.original.email}
            className="w-32 text-center text-xs font-semibold truncate rounded px-1 py-0.5 text-[#11181c] dark:text-white"
          >
            {row.original.email?.length > 25
              ? row.original.email.slice(0, 25) + "..."
              : row.original.email}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <span className="w-20 text-center text-xs font-semibold truncate rounded px-1 py-0.5 text-[#11181c] dark:text-white">
            {row.original.role}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "manager",
      header: "Manager",
      cell: ({ row }) => {
        const manager = data?.allUsers?.find(
          (user: any) => user.user_id === row.original.manager_id
        );
        const color = getRandomAvatarColor();
        return (
          <div className="flex items-center justify-center">
            {manager ? (
              <div className="flex items-center gap-2">
                <Avatar className="w-6 h-6 text-xs flex items-center justify-center">
                  <AvatarFallback
                    className={`${color.bg} ${color.text} font-semibold`}
                  >
                    {manager.username?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <p className="text-xs">{manager.username}</p>
              </div>
            ) : (
              <span className="text-xs text-gray-400">No Manager</span>
            )}
          </div>
        );
      },
    },
  ];

  // Get unique roles from the data
  const roles = useMemo(() => {
    if (!data?.users) return [];
    return [...new Set(data.users.map((user) => user.role).filter(Boolean))];
  }, [data?.users]);

  return (
    <div className="container py-6 max-w-[1050px] mx-auto">
      <div className="mb-4 w-full flex justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 border rounded-md w-64 h-8 p-2 bg-[#f4f4f5] dark:bg-[#11181c]">
            <SearchIcon size={16} />
            <Input
              type="search"
              placeholder="Search for username or email"
              className="border-none ring-none shadow-none focus:border-none focus:ring-none focus-visible:ring-0 focus-visible:ring-offset-0"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {(selectedRole || search) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedRole("");
                setSearch("");
                setPage(1);
              }}
              className="h-8 text-xs"
            >
              Clear Filters
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 h-8">
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
                      onSelect={() => setSelectedRole(role)}
                    >
                      {role}
                    </CommandItem>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {currentUser.role?.toLowerCase() !== "surveyor" && (
            <AddUserModal currentUser={currentUser} data={data} />
          )}
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
            {/* Previous */}
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setPage((prev) => Math.max(prev - 1, 1));
                }}
                className="cursor-pointer"
              />
            </PaginationItem>

            {/* Page Numbers */}
            {getPageNumbers().map((num, idx) => (
              <PaginationItem key={idx}>
                {num === "..." ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink
                    href="#"
                    onClick={(e) => handlePageClick(e, num)}
                    isActive={num === page}
                    className={`px-3 py-1.5 text-sm font-medium rounded-full transition-all duration-300
                ${
                  num === page
                    ? "bg-purple-600 text-white shadow-md scale-105"
                    : "text-gray-800 hover:bg-gray-100 hover:scale-105"
                }`}
                  >
                    {num}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}

            {/* Next */}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setPage((prev) => Math.min(prev + 1, totalPages));
                }}
                className="cursor-pointer"
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
