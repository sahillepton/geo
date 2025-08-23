"use client";
import { useEffect, useMemo, useState } from "react";
import { DataTable } from "./data-table";
import {
  getBlocks,
  getDistricts,
  getStateBlocksAndDistricts,
  getStates,
  getVideoList,
  getVideoList2,
} from "../sidebar/action";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import Papa from "papaparse";
import {
  CalendarIcon,
  ChevronDownIcon,
  ClockIcon,
  DownloadIcon,
  Loader2,
  SearchIcon,
  SquarePen,
} from "lucide-react";
import { useRouter } from "next/navigation";
import moment from "moment";
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
import {
  Select,
  SelectItem,
  SelectContent,
  SelectValue,
  SelectTrigger,
} from "../ui/select";
import { DateRangePicker } from "../sidebar/date-range-picker";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { User } from "@/lib/types";
import { toast } from "sonner";

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
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedBlock, setSelectedBlock] = useState("");
  const [search, setSearch] = useState("");
  const [selectedDateFilter, setSelectedDateFilter] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [showEditRouteModal, setShowEditRouteModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState<any>(null);
  const [newRouteName, setNewRouteName] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadingGpsTrackId, setDownloadingGpsTrackId] = useState("");

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
    setSelectedState("");
    setSelectedDistrict("");
    setSelectedBlock("");
    setSearch("");
    setSelectedDateFilter("");
    setDateFrom(undefined);
    setDateTo(undefined);
    setPage(1);

    // Clear localStorage
    clearAllFiltersFromStorage();

    // Refetch data with cleared filters
    queryClient.prefetchQuery({
      queryKey: ["videos", 1, {}],
      queryFn: async () => {
        const data = await getVideoList({}, 1, 10);
        return JSON.parse(data.data).Result;
      },
    });
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
      console.time("getVideoList");
      const data = await getVideoList(filters, page, 10);
      console.timeEnd("getVideoList");
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
    setSelectedState(value);
  };
  const handleDistrictChange = (value: string) => {
    setSelectedDistrict(value);
  };
  const handleBlockChange = (value: string) => {
    setSelectedBlock(value);
  };

  const handleDateFilterChange = (value: string) => {
    setSelectedDateFilter(value);
    // Reset date ranges when date filter field changes
    setDateFrom(undefined);
    setDateTo(undefined);

    // Reset to page 1 and refetch data with existing filters (excluding date filters)
    setPage(1);
    const currentFilters = getFilters(); // This will include search, state, district, block but not date filters
    queryClient.prefetchQuery({
      queryKey: ["videos", 1, currentFilters],
      queryFn: async () => {
        const data = await getVideoList(currentFilters, 1, 10);
        return JSON.parse(data.data).Result;
      },
    });
  };

  const handleDateRangeChange = (range: { from?: Date; to?: Date }) => {
    setDateFrom(range.from);
    setDateTo(range.to);
  };

  const handleEditRouteName = (route: any) => {
    setEditingRoute(route);
    setNewRouteName(route.routeName);
    setShowEditRouteModal(true);
  };

  const handleUpdateRouteName = async () => {
    try {
      if (!editingRoute || !newRouteName.trim()) return;

      const { error } = await supabase
        .from("surveys")
        .update({ name: newRouteName.trim() })
        .eq("id", editingRoute.surveyId);

      if (error) throw error;

      alert("Route name updated successfully");
      queryClient.invalidateQueries({ queryKey: ["videos"] });
      setShowEditRouteModal(false);
      setEditingRoute(null);
      setNewRouteName("");
    } catch (error: any) {
      console.error("Error updating route name:", error);
      alert("Failed to update route name: " + error.message);
    }
  };

  const closeEditRouteModal = () => {
    setShowEditRouteModal(false);
    setEditingRoute(null);
    setNewRouteName("");
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5; // number of pages to show including ellipsis

    if (100 <= maxPagesToShow) {
      for (let i = 1; i <= 100; i++) pages.push(i);
    } else {
      if (page <= 3) {
        pages.push(1, 2, 3, 4, "...");
      } else if (page >= 100 - 2) {
        pages.push(1, "...", 100 - 3, 100 - 2, 100 - 1, 100);
      } else {
        pages.push(1, "...", page - 1, page, page + 1, "...", 100);
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
      //  const filters = getFilters();
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
      //  console.log("calling date filter");
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

  const handleDownloadGeoJSON = async (gpsTrackId: string) => {
    try {
      setIsDownloading(true);
      setDownloadingGpsTrackId(gpsTrackId);
      const { data, error } = await supabase
        .from("gps_tracks")
        .select("location_data, name")
        .eq("id", gpsTrackId)
        .single();
      if (error) {
        console.error("Error downloading GPS data as CSV:", error);
        toast.error("Failed to download location data");
        return;
      }
      const csv = Papa.unparse(data.location_data);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.name}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`${data.name} downloaded successfully`);
    } catch (error) {
      console.error("Error downloading GPS data as CSV:", error);
      toast.error("Failed to download location data");
    } finally {
      setIsDownloading(false);
      setDownloadingGpsTrackId("");
    }
  };

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
        //console.log(row.original);

        return (
          <div
            className="flex gap-1 w-8 justify-center items-center "
            onClick={() => handleDownloadGeoJSON(row.original.gpsTrackId)}
          >
            <div className="rounded-full p-1 hover:bg-[#e2f0cb] transition">
              {isDownloading &&
              downloadingGpsTrackId === row.original.gpsTrackId ? (
                <Loader2
                  size={16}
                  className="animate-spin cursor-pointer text-[#6a9a23]"
                />
              ) : (
                <DownloadIcon
                  size={16}
                  className="cursor-pointer text-[#6a9a23]"
                />
              )}
            </div>
          </div>
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
        <div className="flex items-center gap-1 w-[200px] group justify-between">
          <p
            className="text-sm font-semibold text-[#46474b] truncate hover:underline transition duration-200 mb-0"
            title={row.original.routeName}
            style={{
              marginBottom: "0px",
            }}
            onClick={() => {
              toast.info("Redirecting to video player...");
              router.push(`/video/${row.original.surveyId}`);
            }}
          >
            {row.original.routeName.length > 22
              ? row.original.routeName.slice(0, 22) + "..."
              : row.original.routeName}
          </p>
          {currentUser.role?.toLowerCase() === "admin" && (
            <div
              className="cursor-pointer hidden group-hover:flex rounded-sm hover:bg-[#eed7fc] p-1"
              onClick={(e) => {
                e.stopPropagation();
                handleEditRouteName(row.original);
              }}
            >
              <SquarePen size={14} />
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "entity_name",
      header: "Entity Name",
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <span className="w-20 text-center text-xs font-semibold text-[#46474b] truncate bg-[#f2f0fc] rounded pl-1 pr-1">
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
          <span className="w-20 text-center text-xs font-semibold text-[#803fb6] truncate bg-[#eed7fc] rounded px-1 py-0.5">
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
          <span className="w-20 text-center text-xs font-semibold text-[#803fb6] truncate bg-[#eed7fc] rounded px-1 py-0.5">
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
          <span className="w-20 text-center text-xs font-semibold text-[#803fb6] truncate bg-[#eed7fc] rounded px-1 py-0.5">
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
          <span className="w-20 text-center text-xs font-semibold text-[#2196ae] truncate bg-[#baf3db] rounded px-1 py-0.5">
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
          <span className="w-20 text-center text-xs font-semibold  text-[#2196ae] truncate bg-[#baf3db]  rounded px-1 py-0.5">
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
        <span
          className={`w-24 text-center text-xs font-semibold ${
            row.original.videoName === "-"
              ? "text-[#d68a00] bg-[#FFFCE6] border border-[#e06c00]"
              : "text-[#296340] bg-[#94c748]"
          }  rounded px-1 py-0.5 truncate`}
        >
          {row.original.videoName === "-"
            ? "Not Uploaded"
            : row.original.videoName.length > 20
            ? row.original.videoName.slice(0, 20) + "..."
            : row.original.videoName}
        </span>
      ),
    },
    {
      accessorKey: "duration",
      header: "Duration",
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <span className="w-16 text-center text-xs gap-2 flex items-center font-semibold text-[#d68a00] bg-[#FFFCE6] border border-[#e06c00] rounded px-1 py-0.5 ">
            {row.original.duration > 0 ? (
              <>
                <ClockIcon size={14} className="ml-1" />
                {sumTimestamps(row.original.duration)}
              </>
            ) : (
              "00:00"
            )}
          </span>
        </div>
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
          <div className="flex items-center gap-1 justify-center w-28 text-xs font-semibold text-[#46474b] bg-[#f2f0fc] border border-[#46474b] rounded px-1 py-0.5">
            <CalendarIcon size={14} />
            <span>{date}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "created_on",
      header: "Created On",
      cell: ({ row }) => {
        const date = moment(row.original.createdOn).format("DD MMM YYYY");
        //const time = moment(row.original.createdOn).format("hh:mm:ss A");
        return (
          <div className="flex items-center gap-1 justify-center w-28 text-xs font-semibold text-[#46474b] bg-[#f2f0fc] border border-[#46474b] rounded px-1 py-0.5">
            <CalendarIcon size={14} />
            <span>{date}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "uploaded_by",
      header: "Uploaded By",
      cell: ({ row }) => {
        const color = getRandomAvatarColor();
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-center">
                <Avatar className="w-6 h-6 text-xs flex items-center justify-center">
                  <AvatarFallback
                    className={`${color.bg} ${color.text} font-semibold`}
                  >
                    {row.original.createdBy.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{row.original.createdBy}</p>
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const statusColor = {
          "IN PROGRESS": "bg-[#cfe3fc] text-[#1d4ed8]",
          DONE: "bg-[#d6f5d6] text-[#1f7d1f]",
          "TO DO": "bg-[#ffe6b3] text-[#b35900]",
        };
        return (
          <span
            className={`w-28 text-center text-xs font-semibold rounded px-1 py-0.5 text-[#29444f] bg-[#b3df72]`}
          >
            {row.original.verifiedStatus}
          </span>
        );
      },
    },
    {
      accessorKey: "verified_on",
      header: "Verified On",
      cell: ({ row }) => {
        return row.original.verifiedOn ? (
          <div className="flex items-center gap-1 justify-center w-28 text-xs font-semibold text-[#46474b] bg-[#f2f0fc] border border-[#46474b] rounded px-1 py-0.5">
            <CalendarIcon size={14} />
            <span>{moment(row.original.verifiedOn).format("DD MMM YYYY")}</span>
          </div>
        ) : (
          <span className="text-xs font-semibold text-[#46474b] bg-[#f2f0fc] border border-[#46474b] rounded px-1 py-0.5">
            Not Verified
          </span>
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
              <Avatar className="w-6 h-6 text-xs flex items-center justify-center">
                <AvatarFallback
                  className={`${color.bg} ${color.text} font-semibold`}
                >
                  {row.original.verifiedBy.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : (
              <span className="text-xs font-semibold text-[#46474b] bg-[#f2f0fc] border border-[#46474b] rounded px-1 py-0.5">
                Not Verified
              </span>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="container py-10 max-w-[1050px] mx-auto">
      <div className="mb-4 w-full flex justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 border rounded-md w-64 h-8 p-2">
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
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-[100px] justify-between font-normal text-xs h-8 p-1"
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
                className="w-[100px] justify-between font-normal text-xs h-8 p-1"
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
                className="w-[100px] justify-between font-normal text-xs h-8 p-1"
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
                className="w-[100px] justify-between font-normal text-xs h-8 p-1"
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
      <DataTable columns={columns} data={data} isFetching={isFetching} />
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
                  setPage((prev) => Math.min(prev + 1, 10000));
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      {/* Edit Route Name Modal */}
      <Dialog open={showEditRouteModal} onOpenChange={setShowEditRouteModal}>
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
            <Button variant="outline" onClick={closeEditRouteModal}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRouteName}>Update Route Name</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
