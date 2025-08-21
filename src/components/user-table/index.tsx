"use client";
import { useEffect, useMemo, useState } from "react";
import { DataTable } from "./data-table";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import {
  ChevronDownIcon,
  EditIcon,
  MailIcon,
  SearchIcon,
  TrashIcon,
  UserIcon,
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

// Mock data for demonstration - replace with actual API calls
const mockUsers = [
  {
    user_id: "fd87cbe4-6af7-4edb-bf86-9aa52c3250a4",
    username: "nipun",
    email: "nipun@lepton.com",
    location: "gurgaon",
    role: "admin",
    manager_id: null,
    manager_name: null,
  },
  {
    user_id: "fd87cbe4-6af7-4edb-bf86-9aa52c3250a5",
    username: "chrollo",
    email: "chrollo@gmail.com",
    location: "delhi",
    role: "manager",
    manager_id: "fd87cbe4-6af7-4edb-bf86-9aa52c3250a4",
    manager_name: "nipun",
  },
  {
    user_id: "fd87cbe4-6af7-4edb-bf86-9aa52c3250a6",
    username: "chrollo2",
    email: "chrollo2@gmail.com",
    location: "mumbai",
    role: "manager",
    manager_id: null,
    manager_name: null,
  },
  {
    user_id: "fd87cbe4-6af7-4edb-bf86-9aa52c3250a7",
    username: "nipun2",
    email: "ncc@khachroad.com",
    location: "bangalore",
    role: "surveyor",
    manager_id: "fd87cbe4-6af7-4edb-bf86-9aa52c3250a8",
    manager_name: "MP_NCC",
  },
];

// Mock API function - replace with actual API call
const getUsers = async (filters: any, page: number, limit: number) => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  let filteredUsers = [...mockUsers];

  // Apply filters
  if (filters.search) {
    filteredUsers = filteredUsers.filter(
      (user) =>
        user.username.toLowerCase().includes(filters.search.toLowerCase()) ||
        user.email.toLowerCase().includes(filters.search.toLowerCase())
    );
  }

  if (filters.role) {
    filteredUsers = filteredUsers.filter((user) => user.role === filters.role);
  }

  if (filters.location) {
    filteredUsers = filteredUsers.filter(
      (user) => user.location === filters.location
    );
  }

  // Apply pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  return {
    data: paginatedUsers,
    total: filteredUsers.length,
    hasMore: endIndex < filteredUsers.length,
  };
};

export default function UserTable() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");

  const getFilters = () => {
    const filters: any = {};
    if (search) {
      filters.search = search;
    }
    if (selectedRole) {
      filters.role = selectedRole;
    }
    if (selectedLocation) {
      filters.location = selectedLocation;
    }
    return filters;
  };

  const filters = useMemo(
    () => getFilters(),
    [search, selectedRole, selectedLocation]
  );

  const { status, data, error, isFetching, isPlaceholderData } = useQuery({
    queryKey: ["users", page, filters],
    queryFn: async () => {
      const result = await getUsers(filters, page, 10);
      return result;
    },
    placeholderData: keepPreviousData,
    staleTime: 5000,
  });

  const handleRoleChange = (value: string) => {
    setSelectedRole(value);
  };

  const handleLocationChange = (value: string) => {
    setSelectedLocation(value);
  };

  const handleEditUser = (userId: string) => {
    console.log("Edit user:", userId);
    // Implement edit functionality
  };

  const handleDeleteUser = (userId: string) => {
    console.log("Delete user:", userId);
    // Implement delete functionality
  };

  const getPageNumbers = () => {
    const totalPages = Math.ceil((data?.total || 0) / 10);
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

  useEffect(() => {
    if (!isPlaceholderData && data?.hasMore) {
      queryClient.prefetchQuery({
        queryKey: ["users", page + 1, filters],
        queryFn: () => getUsers(filters, page + 1, 10),
      });
    }
  }, [data, isPlaceholderData, page, queryClient, filters]);

  useEffect(() => {
    setPage(1);
    queryClient.prefetchQuery({
      queryKey: ["users", 1, filters],
      queryFn: async () => {
        const result = await getUsers(filters, 1, 10);
        return result;
      },
    });
  }, [filters, queryClient]);

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "username",
      header: () => (
        <div className="flex items-center gap-1">
          <UserIcon size={16} />
          <span>USERNAME ↑</span>
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <UserIcon size={14} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-900">
            {row.original.username}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "email",
      header: "EMAIL",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <MailIcon size={14} className="text-gray-500" />
          <span className="text-sm text-gray-700">{row.original.email}</span>
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: "ROLE",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <UserIcon size={14} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-900">
            {row.original.role}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "manager",
      header: "MANAGER",
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          {row.original.manager_name ? (
            <span className="text-sm text-gray-700">
              {row.original.manager_name}
            </span>
          ) : (
            <span className="text-sm text-gray-400">-</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "actions",
      header: "ACTIONS",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 justify-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEditUser(row.original.user_id)}
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
                onClick={() => handleDeleteUser(row.original.user_id)}
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
  ];

  const roles = ["admin", "manager", "surveyor"];
  const locations = ["gurgaon", "delhi", "mumbai", "bangalore"];

  return (
    <div className="container py-10 w-[1050px]">
      <div className="mb-4 w-full flex justify-between">
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
                      onSelect={() => handleRoleChange(role)}
                    >
                      {role}
                    </CommandItem>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-[100px] justify-between font-normal text-xs h-8 p-1"
              >
                <span className="truncate flex-1 text-left">
                  {selectedLocation || "Location"}
                </span>
                <ChevronDownIcon className="h-3 w-3 flex-shrink-0 ml-1" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[180px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search locations..." />
                <CommandList>
                  <CommandEmpty>No location found.</CommandEmpty>
                  {locations.map((location, idx) => (
                    <CommandItem
                      key={idx}
                      value={location}
                      onSelect={() => handleLocationChange(location)}
                    >
                      {location}
                    </CommandItem>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.data || []}
        isFetching={isFetching}
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
                  const totalPages = Math.ceil((data?.total || 0) / 10);
                  setPage((prev) => Math.min(prev + 1, totalPages));
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
