"use client";
import { useEffect, useMemo, useState } from "react";
import { DataTable } from "./data-table";
import {
  getBlocks,
  getDistricts,
  getStateBlocksAndDistricts,
  getStates,
  getVideoList,
} from "../sidebar/action";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import {
  CalendarIcon,
  ChevronDownIcon,
  ClockIcon,
  DownloadIcon,
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

export default function SurveyTable() {
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

  const getFilters = () => {
    const filters: any = {};
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
    if (selectedDateFilter && dateFrom && dateTo) {
      filters.dateKey = selectedDateFilter;
      filters.dateFrom = dateFrom.toISOString().split("T")[0];
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
      const data = await getVideoList(filters, page, 10);
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

  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5; // number of pages to show including ellipsis

    if (10000 <= maxPagesToShow) {
      for (let i = 1; i <= 10000; i++) pages.push(i);
    } else {
      if (page <= 3) {
        pages.push(1, 2, 3, 4, "...");
      } else if (page >= 10000 - 2) {
        pages.push(1, "...", 10000 - 3, 10000 - 2, 10000 - 1, 10000);
      } else {
        pages.push(1, "...", page - 1, page, page + 1, "...", 10000);
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
    // Only trigger when all three date filter conditions are met, or when non-date filters change
    const hasCompleteDateFilter = selectedDateFilter && dateFrom && dateTo;
    const hasNonDateFilters =
      selectedState || selectedDistrict || selectedBlock || search;

    // Only reset page and prefetch if we have complete date filters OR non-date filters
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

  const handleDownloadGeoJSON = async (record: any) => {
    if (!record || record.length === 0) return;
    try {
      const locationData = record;
      const csvRows = [];
      const headers = Object.keys(locationData[0]);
      csvRows.push(headers.join(","));

      for (const row of locationData) {
        const values = headers.map((header) => {
          let val = row[header];
          if (typeof val === "string") val = `"${val.replace(/"/g, '""')}"`;
          return val;
        });
        csvRows.push(values.join(","));
      }

      const csvString = csvRows.join("\n");
      const blob = new Blob([csvString], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${record.videoName || "gps_data"}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading GPS data as CSV:", error);
    }
  };

  function sumTimestamps(totalSeconds: number) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    console.log(minutes, "minutes");
    console.log(seconds, "seconds");

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
            onClick={() => handleDownloadGeoJSON(row.original.locationData)}
          >
            <div className="rounded-full p-1 hover:bg-[#e2f0cb] transition">
              <DownloadIcon
                size={16}
                className="cursor-pointer text-[#6a9a23]"
              />
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
              router.push(`/video/${row.original.surveyId}`);
            }}
          >
            {row.original.routeName.length > 22
              ? row.original.routeName.slice(0, 22) + "..."
              : row.original.routeName}
          </p>
          <div className="cursor-pointer hidden group-hover:flex rounded-sm hover:bg-[#eed7fc] p-1">
            <SquarePen size={14} />
          </div>
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
          className={
            "w-24 text-center text-xs font-semibold text-[#d68a00] bg-[#FFFCE6] border border-[#e06c00] rounded px-1 py-0.5 truncate"
          }
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
            {row.original.locationData.length > 0 ? (
              <>
                <ClockIcon size={14} className="ml-1" />
                {sumTimestamps(
                  parseInt(
                    row.original.locationData[
                      row.original.locationData.length - 1
                    ].timeStamp
                  )
                )}
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
        return (
          <div className="flex items-center gap-1 justify-center w-28 text-xs font-semibold text-[#46474b] bg-[#f2f0fc] border border-[#46474b] rounded px-1 py-0.5">
            <CalendarIcon size={14} />
            <span>{row.original.verifiedOn}</span>
          </div>
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
            <Avatar className="w-6 h-6 text-xs flex items-center justify-center">
              <AvatarFallback
                className={`${color.bg} ${color.text} font-semibold`}
              >
                {row.original.createdBy.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        );
      },
    },
  ];

  return (
    <div className="container py-10 w-[1050px]">
      <div className="mb-4 w-full flex justify-between">
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
    </div>
  );
}
