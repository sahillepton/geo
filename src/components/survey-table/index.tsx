"use client";
import React, { useEffect, useMemo, useState } from "react";
import { DataTable } from "./data-table";
import {
  getBlocks,
  getDistricts,
  getStates,
  getVideoList,
} from "../sidebar/action";

import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  BadgeCheckIcon,
  CalendarIcon,
  ChevronDownIcon,
  ClockIcon,
  DownloadIcon,
  Loader2,
  RouteIcon,
  SearchIcon,
  Settings2,
  SquarePen,
  XIcon,
} from "lucide-react";
import moment from "moment";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
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
import { Input } from "../ui/input";
import { Command, CommandItem, CommandEmpty, CommandList } from "../ui/command";
import { CommandInput } from "../ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

import { DateRangePicker } from "../sidebar/date-range-picker";
import { User } from "@/lib/types";
import { useSurveyStore } from "@/lib/store";

import {
  getStateDistrictFromBlockName,
  getStateFromDistrictName,
} from "@/lib/get-state-district";
import RowAction from "./row-action";
import { Badge } from "../ui/badge";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../ui/hover-card";
import Link from "next/link";
import { useSidebar } from "../ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "../ui/dropdown-menu";

// Define some color pairs
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

export default function SurveyTable({ currentUser }: { currentUser: User }) {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedBlock, setSelectedBlock] = useState("");
  const [search, setSearch] = useState("");
  const [selectedDateFilter, setSelectedDateFilter] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const { setSurveys, setLoading } = useSurveyStore();
  const { open } = useSidebar();

  // Load all filters from localStorage on component mount
  useEffect(() => {
    try {
      // Load date filters
      const savedDateFilter = localStorage.getItem("surveyTable_dateFilter");
      const savedDateFrom = localStorage.getItem("surveyTable_dateFrom");
      const savedDateTo = localStorage.getItem("surveyTable_dateTo");

      if (savedDateFilter) {
        setSelectedDateFilter(savedDateFilter);
      }
      if (savedDateFrom) {
        setDateFrom(new Date(savedDateFrom));
      }
      if (savedDateTo) {
        setDateTo(new Date(savedDateTo));
      }

      // Load other filters
      const savedSearch = localStorage.getItem("surveyTable_search");
      const savedState = localStorage.getItem("surveyTable_state");
      const savedDistrict = localStorage.getItem("surveyTable_district");
      const savedBlock = localStorage.getItem("surveyTable_block");
      const savedPage = localStorage.getItem("surveyTable_page");

      if (savedSearch) {
        setSearch(savedSearch);
      }
      if (savedState) {
        setSelectedState(savedState);
      }
      if (savedDistrict) {
        setSelectedDistrict(savedDistrict);
      }
      if (savedBlock) {
        setSelectedBlock(savedBlock);
      }
      if (savedPage) {
        setPage(parseInt(savedPage, 10));
      }
    } catch (error) {
      console.error("Error loading filters from localStorage:", error);
    }
  }, []);

  // Save all filters to localStorage
  const saveFiltersToStorage = () => {
    try {
      // Save date filters
      if (selectedDateFilter) {
        localStorage.setItem("surveyTable_dateFilter", selectedDateFilter);
      } else {
        localStorage.removeItem("surveyTable_dateFilter");
      }

      if (dateFrom) {
        localStorage.setItem("surveyTable_dateFrom", dateFrom.toISOString());
      } else {
        localStorage.removeItem("surveyTable_dateFrom");
      }

      if (dateTo) {
        localStorage.setItem("surveyTable_dateTo", dateTo.toISOString());
      } else {
        localStorage.removeItem("surveyTable_dateTo");
      }

      // Save other filters
      if (search) {
        localStorage.setItem("surveyTable_search", search);
      } else {
        localStorage.removeItem("surveyTable_search");
      }

      if (selectedState) {
        localStorage.setItem("surveyTable_state", selectedState);
      } else {
        localStorage.removeItem("surveyTable_state");
      }

      if (selectedDistrict) {
        localStorage.setItem("surveyTable_district", selectedDistrict);
      } else {
        localStorage.removeItem("surveyTable_district");
      }

      if (selectedBlock) {
        localStorage.setItem("surveyTable_block", selectedBlock);
      } else {
        localStorage.removeItem("surveyTable_block");
      }

      // Save page number
      localStorage.setItem("surveyTable_page", page.toString());
    } catch (error) {
      console.error("Error saving filters to localStorage:", error);
    }
  };

  // Save all filters to localStorage whenever they change
  useEffect(() => {
    saveFiltersToStorage();
  }, [
    selectedDateFilter,
    dateFrom,
    dateTo,
    search,
    selectedState,
    selectedDistrict,
    selectedBlock,
    page,
  ]);

  // Clear all filters from localStorage
  const clearAllFiltersFromStorage = () => {
    try {
      localStorage.removeItem("surveyTable_dateFilter");
      localStorage.removeItem("surveyTable_dateFrom");
      localStorage.removeItem("surveyTable_dateTo");
      localStorage.removeItem("surveyTable_search");
      localStorage.removeItem("surveyTable_state");
      localStorage.removeItem("surveyTable_district");
      localStorage.removeItem("surveyTable_block");
      localStorage.removeItem("surveyTable_page");
    } catch (error) {
      console.error("Error clearing filters from localStorage:", error);
    }
  };

  // Clear all filters and localStorage
  const handleClearAllFilters = () => {
    // Batch all filter clearing operations
    React.startTransition(() => {
      setSelectedState("");
      setSelectedDistrict("");
      setSelectedBlock("");
      setSearch("");
      setSelectedDateFilter("");
      setDateFrom(undefined);
      setDateTo(undefined);
      setPage(1);
    });

    // Clear localStorage
    clearAllFiltersFromStorage();
  };

  const getFilters = () => {
    const filters: any = {};
    filters.userRole = currentUser.role;
    filters.userId = currentUser.user_id;
    if (selectedDistrict) {
      filters.district = selectedDistrict;
    }
    if (selectedBlock) {
      filters.block = selectedBlock;
    }
    if (selectedState) {
      filters.state = selectedState;
    }
    if (search) {
      filters.routeName = search;
    }
    if (selectedDateFilter) {
      filters.dateKey = selectedDateFilter;
    }
    if (dateFrom) {
      filters.dateFrom = dateFrom.toISOString().split("T")[0];
    }
    if (dateTo) {
      filters.dateTo = dateTo.toISOString().split("T")[0];
    }
    return filters;
  };

  const filters = useMemo(
    () => getFilters(),
    [
      selectedState,
      selectedDistrict,
      selectedBlock,
      search,
      selectedDateFilter,
      dateFrom,
      dateTo,
    ]
  );

  const { status, data, error, isFetching, isPlaceholderData } = useQuery({
    queryKey: ["videos", page, filters],
    queryFn: async () => {
      setLoading(true);
      const data = await getVideoList(filters, page, 10);
      setSurveys(
        JSON.parse(data.data).Result.map((survey: any) => ({
          id: survey.surveyId,
          name: survey.routeName,
        }))
      );
      //   console.log(JSON.parse(data.data).Result, "data");
      setLoading(false);
      return JSON.parse(data.data).Result;
    },
    placeholderData: keepPreviousData,
    staleTime: 5000,
  });

  const { data: states, isLoading: statesLoading } = useQuery({
    queryKey: ["states"],
    queryFn: () => getStates(),
  });
  const { data: districts, isLoading: districtsLoading } = useQuery({
    queryKey: ["districts"],
    queryFn: () => getDistricts(),
  });
  const { data: blocks, isLoading: blocksLoading } = useQuery({
    queryKey: ["blocks"],
    queryFn: () => getBlocks(),
  });

  const handleStateChange = (value: string) => {
    // Use React's automatic batching by wrapping in a function
    React.startTransition(() => {
      setSelectedState(value);
      // Clear dependent filters when state changes
      setSelectedDistrict("");
      setSelectedBlock("");
    });
  };

  const handleDistrictChange = async (value: string) => {
    const state = await getStateFromDistrictName(value);
    //  console.log(state, "state");

    // Batch all state updates together
    React.startTransition(() => {
      setSelectedState(state.st_name);
      setSelectedDistrict(value);
      // Clear dependent filter when district changes
      setSelectedBlock("");
    });
  };

  const handleBlockChange = async (value: string) => {
    const stateDistrict = await getStateDistrictFromBlockName(value);
    //  console.log(stateDistrict, "stateDistrict");

    // Batch all state updates together
    React.startTransition(() => {
      setSelectedState(stateDistrict.st_name);
      setSelectedDistrict(stateDistrict.dt_name);
      setSelectedBlock(value);
    });
  };

  const handleDateFilterChange = (value: string) => {
    // Batch all date-related state updates
    React.startTransition(() => {
      setSelectedDateFilter(value);
      // Reset date ranges when date filter field changes
      setDateFrom(undefined);
      setDateTo(undefined);
      // Reset to page 1
      setPage(1);
    });
  };

  const handleDateRangeChange = (range: { from?: Date; to?: Date }) => {
    // Batch date range updates
    React.startTransition(() => {
      setDateFrom(range.from);
      setDateTo(range.to);
    });
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    const pageSize = 10;
    if (!data || !data[0]) return [];

    // Calculate total pages based on count and page size
    const totalPages = Math.ceil(data[0].count / pageSize);

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
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
        queryKey: ["videos", page + 1, filters],
        queryFn: () => getVideoList(filters, page + 1, 10),
      });
    }
  }, [data, isPlaceholderData, page, queryClient, filters]);

  useEffect(() => {
    const hasCompleteDateFilter = selectedDateFilter && dateFrom && dateTo;
    const hasNonDateFilters =
      selectedState || selectedDistrict || selectedBlock || search;
    if (hasCompleteDateFilter || hasNonDateFilters) {
      setPage(1);
      queryClient.prefetchQuery({
        queryKey: ["videos", 1, filters],
        queryFn: async () => {
          const data = await getVideoList(filters, 1, 10);
          return JSON.parse(data.data).Result;
        },
      });
    }
  }, [
    filters,
    queryClient,
    selectedDateFilter,
    dateFrom,
    dateTo,
    selectedState,
    selectedDistrict,
    selectedBlock,
    search,
  ]);

  function sumTimestamps(totalSeconds: number) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    // console.log(minutes, "minutes");
    //console.log(seconds, "seconds");

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0"
    )}`;
  }

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "action",
      header: "",
      cell: ({ row }) => {
        return (
          <RowAction
            gpsTrackId={row.original.gpsTrackId}
            surveyId={row.original.surveyId}
            routeName={row.original.routeName}
            role={currentUser.role}
          />
        );
      },
    },
    {
      accessorKey: "route_name",
      header: () => (
        <span className="!text-left" style={{ textAlign: "left" }}>
          Route Name
        </span>
      ),
      cell: ({ row }) => (
        <HoverCard>
          <HoverCardTrigger asChild>
            <Button variant="link" className="text-left">
              {row.original.routeName}
            </Button>
          </HoverCardTrigger>
          <HoverCardContent className="w-80">
            <div className="flex gap-4 items-center">
              <div className="bg-black text-white rounded-full p-2 w-10 h-10 flex items-center justify-center">
                <RouteIcon size={20} />
              </div>
              <div className="space-y-1">
                <Link
                  href={`/video/${row.original.surveyId}`}
                  className="text-sm font-semibold hover:underline"
                >
                  {row.original.routeName}
                </Link>
                <div className="flex gap-2">
                  <Badge variant={"secondary"}>{row.original.state}</Badge>
                  <Badge variant={"secondary"}>{row.original.district}</Badge>
                  <Badge variant={"secondary"}>{row.original.block}</Badge>
                </div>
                <div className="text-muted-foreground text-xs">
                  {moment(row.original.mobileVideoCaptureTime).format(
                    "DD MMM YYYY"
                  )}
                </div>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>
      ),
    },
    {
      accessorKey: "entity_name",
      header: "Entity Name",
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <span
            title={row.original.entityName}
            className="w-20 text-center text-xs font-semibold  truncate rounded pl-1 pr-1 text-[#11181c] dark:text-white"
          >
            {row.original.entityName.length > 20
              ? row.original.entityName.slice(0, 20) + "..."
              : row.original.entityName}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "state",
      header: "State",
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <span
            title={row.original.state}
            className="w-20 text-center text-xs font-semibold truncate rounded px-1 py-0.5 text-[#11181c] dark:text-white"
          >
            {row.original.state.length > 20
              ? row.original.state.slice(0, 20) + "..."
              : row.original.state}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "district",
      header: "District",
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <span
            title={row.original.district}
            className="w-20 text-center text-xs font-semibold  truncate  rounded px-1 py-0.5 text-[#11181c] dark:text-white"
          >
            {row.original.district.length > 20
              ? row.original.district.slice(0, 20) + "..."
              : row.original.district}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "block",
      header: "Block",
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <span
            title={row.original.block}
            className="w-20 text-center text-xs font-semibold  truncate  rounded px-1 py-0.5 text-[#11181c] dark:text-white"
          >
            {row.original.block.length > 20
              ? row.original.block.slice(0, 20) + "..."
              : row.original.block}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "ring",
      header: "Ring",
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <span className="w-20 text-center text-xs font-semibold  truncate  rounded px-1 py-0.5 text-[#11181c] dark:text-white">
            {row.original.ring.length > 20
              ? row.original.ring.slice(0, 20) + "..."
              : row.original.ring}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "child_ring",
      header: "Child Ring",
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <span className="w-20 text-center text-xs font-semibold  truncate  rounded px-1 py-0.5 text-[#11181c] dark:text-white">
            {row.original.childRing.length > 20
              ? row.original.childRing.slice(0, 20) + "..."
              : row.original.childRing}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "video_name",
      header: "Video Name",
      cell: ({ row }) => (
        <Badge
          className={`text-xs ${
            row.original.videoName === "-"
              ? "bg-[#fdd0df] text-[#c20e4d]"
              : "bg-[#d1f4e0] text-[#419967]"
          }`}
        >
          {row.original.videoName === "-" ? (
            <span className="flex items-center gap-1">
              {" "}
              <XIcon size={14} /> Not Uploaded
            </span>
          ) : (
            row.original.videoName
          )}
        </Badge>
      ),
    },
    {
      accessorKey: "duration",
      header: "Duration",
      cell: ({ row }) => (
        <Badge variant={"secondary"}>
          {row.original.duration > 0 ? (
            <>
              <ClockIcon size={14} className="ml-1" />
              {sumTimestamps(row.original.duration)}
            </>
          ) : (
            "00:00"
          )}
        </Badge>
      ),
    },
    {
      accessorKey: "uploaded_on",
      header: "Uploaded On",
      cell: ({ row }) => {
        const date = moment(row.original.mobileVideoCaptureTime).format(
          "DD MMM YYYY"
        );
        const time = moment(row.original.mobileVideoCaptureTime).format(
          "hh:mm:ss A"
        );
        return (
          <Badge variant={"secondary"}>
            <CalendarIcon size={14} />
            <span>{date}</span>
          </Badge>
        );
      },
    },
    {
      accessorKey: "created_on",
      header: "Created On",
      cell: ({ row }) => {
        const date = moment(row.original.createdOn).format("DD MMM YYYY");
        return (
          <Badge variant={"secondary"}>
            <CalendarIcon size={14} />
            <span>{date}</span>
          </Badge>
        );
      },
    },
    {
      accessorKey: "uploaded_by",
      header: "Uploaded By",
      cell: ({ row }) => {
        const color = getRandomAvatarColor();
        return (
          <div className="flex items-center justify-center">
            <Avatar className="w-6 h-6 text-xs flex items-center justify-center mr-2">
              <AvatarFallback
                className={`${color.bg} ${color.text} font-semibold`}
              >
                {row.original.createdBy.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <p className="text-xs">{row.original.createdBy}</p>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        return (
          <Badge
            variant="secondary"
            className={`${
              row.original.verifiedStates === "APPROVED"
                ? "bg-blue-500 dark:bg-blue-600"
                : "bg-orange-500 dark:bg-orange-600"
            }  text-xs text-white`}
          >
            <BadgeCheckIcon size={14} />
            {row.original.verifiedStatus === "APPROVED"
              ? "APPROVED"
              : "PENDING"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "verified_on",
      header: "Verified On",
      cell: ({ row }) => {
        return (
          <Badge className="bg-[#fdd0df] text-[#c20e4d]">
            <CalendarIcon size={14} />
            <span>
              {row.original.verifiedOn
                ? moment(row.original.verifiedOn).format("DD MMM YYYY")
                : "Not Verified"}
            </span>
          </Badge>
        );
      },
    },
    {
      accessorKey: "verified_by",
      header: "Verified By",
      cell: ({ row }) => {
        const color = getRandomAvatarColor();
        return (
          <div className="flex items-center justify-center">
            {row.original.verifiedBy ? (
              <div className="flex items-center gap-2">
                <Avatar className="w-6 h-6 text-xs flex items-center justify-center">
                  <AvatarFallback
                    className={`${color.bg} ${color.text} font-semibold`}
                  >
                    {row.original.verifiedBy.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <p className="text-xs">{row.original.verifiedBy}</p>
              </div>
            ) : (
              <Badge className="bg-[#fdd0df] text-[#c20e4d]">
                <XIcon size={14} /> Not Verified
              </Badge>
            )}
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div
      className={`container py-6 ${
        open ? "max-w-[1050px]" : "max-w-[1300px]"
      }  mx-auto transition-all duration-300`}
    >
      <div className="mb-4 w-full flex justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 border rounded-md w-64 h-8 p-2 bg-[#f4f4f5] dark:bg-[#11181c]">
            <SearchIcon size={16} />
            <Input
              type="search"
              placeholder="Search for route name"
              className="border-none ring-none shadow-none focus:border-none focus:ring-none focus-visible:ring-0 focus-visible:ring-offset-0"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {(selectedState ||
            selectedDistrict ||
            selectedBlock ||
            search ||
            selectedDateFilter) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAllFilters}
              className="h-8 text-xs"
            >
              Clear Filters
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 h-8">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-[80px] justify-between font-normal text-xs h-8 p-1 bg-[#006fee] text-white rounded-lg border-none hover:bg-[#006fee]/80 hover:text-white "
              >
                <Settings2 />
                View
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[150px]">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== "undefined" &&
                    column.getCanHide()
                )
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-[80px] justify-between font-normal text-xs h-8 p-1 bg-[#006fee] text-white rounded-lg border-none hover:bg-[#006fee]/80 hover:text-white"
              >
                <span className="truncate flex-1 text-left">
                  {selectedState || "State"}
                </span>
                <ChevronDownIcon className="h-3 w-3 flex-shrink-0 ml-1" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[180px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search states..." />
                <CommandList>
                  <CommandEmpty>No state found.</CommandEmpty>
                  {statesLoading ? (
                    <CommandItem value="Loading...">Loading States</CommandItem>
                  ) : (
                    states?.map((state: any, idx: number) => (
                      <CommandItem
                        key={idx}
                        value={state.st_name}
                        onSelect={() => handleStateChange(state.st_name)}
                      >
                        {state.st_name}
                      </CommandItem>
                    ))
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-[80px] justify-between font-normal text-xs h-8 p-1 bg-[#006fee] text-white rounded-lg border-none hover:bg-[#006fee]/80 hover:text-white"
              >
                <span className="truncate flex-1 text-left">
                  {selectedDistrict || "District"}
                </span>
                <ChevronDownIcon className="h-3 w-3 flex-shrink-0 ml-1" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[180px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search districts..." />
                <CommandList>
                  <CommandEmpty>No district found.</CommandEmpty>
                  {districtsLoading ? (
                    <CommandItem value="Loading...">
                      Loading Districts
                    </CommandItem>
                  ) : (
                    districts?.map((district: any, idx: number) => (
                      <CommandItem
                        key={idx}
                        value={district.dt_name}
                        onSelect={() => handleDistrictChange(district.dt_name)}
                      >
                        {district.dt_name}
                      </CommandItem>
                    ))
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-[80px] justify-between font-normal text-xs h-8 p-1 bg-[#006fee] text-white rounded-lg border-none hover:bg-[#006fee]/80 hover:text-white"
              >
                <span className="truncate flex-1 text-left">
                  {selectedBlock || "Block"}
                </span>
                <ChevronDownIcon className="h-3 w-3 flex-shrink-0 ml-1" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[180px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search blocks..." />
                <CommandList>
                  <CommandEmpty>No block found.</CommandEmpty>
                  {blocksLoading ? (
                    <CommandItem value="Loading...">Loading Blocks</CommandItem>
                  ) : (
                    blocks?.map((block: any, idx: number) => (
                      <CommandItem
                        key={idx}
                        value={block.blk_name}
                        onSelect={() => handleBlockChange(block.blk_name)}
                      >
                        {block.blk_name}
                      </CommandItem>
                    ))
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-[80px] justify-between font-normal text-xs h-8 p-1 bg-[#006fee] text-white rounded-lg border-none hover:bg-[#006fee]/80 hover:text-white"
              >
                <span className="truncate flex-1 text-left">
                  {selectedDateFilter === "Mobile_Video_Capture_Time"
                    ? "Uploaded On"
                    : selectedDateFilter === "Created_On"
                    ? "Created On"
                    : "Date Filter"}
                </span>
                <ChevronDownIcon className="h-3 w-3 flex-shrink-0 ml-1" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[100px] p-0" align="start">
              <Command>
                <CommandList>
                  <CommandItem
                    value="Mobile_Video_Capture_Time"
                    onSelect={() =>
                      handleDateFilterChange("Mobile_Video_Capture_Time")
                    }
                  >
                    Uploaded On
                  </CommandItem>
                  <CommandItem
                    value="Created_On"
                    onSelect={() => handleDateFilterChange("Created_On")}
                  >
                    Created On
                  </CommandItem>
                  {/* <CommandItem
                    value="Verified_On"
                    onSelect={() => handleDateFilterChange("Verified_On")}
                  >
                    Verified On
                  </CommandItem> */}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <DateRangePicker
            from={dateFrom}
            to={dateTo}
            onSelect={handleDateRangeChange}
            disabled={!selectedDateFilter}
          />
        </div>
      </div>
      <DataTable
        columns={columns}
        data={data}
        isFetching={isFetching}
        table={table}
      />
      <p className="text-sm text-gray-500 mt-1 text-center">
        {data && data.length > 0 ? data[0].count : 0} results found
      </p>
      <div className="flex items-center justify-center py-4 mt-4">
        <Pagination>
          <PaginationContent className="gap-1">
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
                  setPage((prev) => Math.min(prev + 1, 10000));
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
