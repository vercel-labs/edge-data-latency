import { Button, Card, Title, AreaChart, ColGrid, Text } from "@tremor/react";
import { useCallback, useState } from "react";
import { Dropdown, DropdownItem } from "@tremor/react";
import {
  ShoppingCartIcon,
  DatabaseIcon,
  LightningBoltIcon,
} from "@heroicons/react/solid";
import Image from "next/image";

const ATTEMPTS = 10;

type Region = "regional" | "global";

export default function Page() {
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [shouldTestGlobal, setShouldTestGlobal] = useState(true);
  const [shouldTestRegional, setShouldTestRegional] = useState(true);
  const [queryCount, setQueryCount] = useState(1);
  const [dataService, setDataService] = useState("planetscale");
  const [data, setData] = useState({
    regional: [],
    global: [],
  });

  const runTest = useCallback(
    async (dataService: string, type: Region, queryCount: number) => {
      try {
        const start = Date.now();
        const res = await fetch(
          `/api/${dataService}-${type}?count=${queryCount}`
        );
        const data = await res.json();
        const end = Date.now();
        return {
          ...data,
          elapsed: end - start,
        };
      } catch (e) {
        // instead of retrying we just give up
        return null;
      }
    },
    []
  );

  const onRunTest = useCallback(async () => {
    setIsTestRunning(true);
    setData({ regional: [], global: [] });

    for (let i = 0; i < ATTEMPTS; i++) {
      let regionalValue = null;
      let globalValue = null;

      if (shouldTestRegional) {
        regionalValue = await runTest(dataService, "regional", queryCount);
      }

      if (shouldTestGlobal) {
        globalValue = await runTest(dataService, "global", queryCount);
      }

      setData((data) => {
        return {
          ...data,
          regional: [...data.regional, regionalValue],
          global: [...data.global, globalValue],
        };
      });
    }

    setIsTestRunning(false);
  }, [runTest, queryCount, dataService, shouldTestGlobal, shouldTestRegional]);

  return (
    <main className="p-6 max-w-5xl flex flex-col gap-3">
      <h1 className="text-2xl font-bold">Edge &lt;&gt; Data latency</h1>
      <p>
        This demo helps observe the latency characteristics of querying
        different popular data services from varying compute locations.
      </p>

      <form className="flex flex-col gap-5 bg-gray-100 p-5 my-5">
        <div className="flex flex-col gap-1">
          <p className="font-bold">Data service</p>
          <p className="text-gray-500 text-sm">
            Vercel Edge Functions support multiple regions. By default
            they&apos;re global, but it&apos;s possible to express a region
            preference via the <Code className="text-xs">region</Code> setting.
          </p>

          <div className="py-1 inline-flex">
            <Dropdown
              defaultValue="planetscale"
              onValueChange={(v) => setDataService(v)}
              maxWidth="max-w-xs"
            >
              <DropdownItem
                value="planetscale"
                text="PlanetScale (Kysely + Serverless SDK)"
                icon={DatabaseIcon}
              />
              <DropdownItem
                value="shopify"
                text="Shopify (Storefront GraphQL API)"
                icon={ShoppingCartIcon}
              />
              <DropdownItem
                value="supabase"
                text="Supabase (supabase-js)"
                icon={LightningBoltIcon}
              />
              <DropdownItem value="xata" text="Xata (SDK)" icon={XataIcon} />
              <DropdownItem value="upstash" text="Upstash (SDK)" icon={UpstashIcon} />
            </Dropdown>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <p className="font-bold">Location</p>
          <p className="text-gray-500 text-sm">
            Vercel Edge Functions support multiple regions. By default
            they&apos;re global, but it&apos;s possible to express a region
            preference via the <Code className="text-xs">region</Code> setting.
          </p>
          <p className="text-sm flex gap-3 flex-wrap gap-y-1">
            <label className="flex items-center gap-2 whitespace-nowrap">
              <input
                type="checkbox"
                disabled
                name="region"
                value="global"
                checked={shouldTestGlobal}
                onChange={(e) => setShouldTestGlobal(e.target.checked)}
              />{" "}
              Test global function
            </label>
            <label className="flex items-center gap-2 whitespace-nowrap">
              <input
                type="checkbox"
                disabled
                name="region"
                value="regional"
                checked={shouldTestRegional}
                onChange={(e) => setShouldTestRegional(e.target.checked)}
              />{" "}
              Test regional (IAD) function
            </label>
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <p className="font-bold">Waterfall</p>
          <p className="text-gray-500 text-sm">
            Executing complex API routes globally can be slow when the database
            is single-region, due to having multiple roundtrips to a single
            server that&apos;s distant from the user.
          </p>
          <p className="text-sm flex gap-3 flex-wrap gap-y-1">
            <label className="flex items-center gap-2 whitespace-nowrap">
              <input
                type="radio"
                name="queries"
                value="1"
                onChange={() => setQueryCount(1)}
                checked={queryCount === 1}
              />{" "}
              Single query (no waterfall)
            </label>
            <label className="flex items-center gap-2 whitespace-nowrap">
              <input
                type="radio"
                name="queries"
                value="2"
                onChange={() => setQueryCount(2)}
                checked={queryCount === 2}
              />{" "}
              2 serial queries
            </label>
            <label className="flex items-center gap-2 whitespace-nowrap">
              <input
                type="radio"
                name="queries"
                value="5"
                onChange={() => setQueryCount(5)}
                checked={queryCount === 5}
              />{" "}
              5 serial queries
            </label>
          </p>
        </div>

        <div>
          <Button
            onClick={onRunTest}
            loading={isTestRunning}
          >
            Run Test
          </Button>
        </div>

        {data.regional.length || data.global.length ? (
          <ColGrid numCols={1} numColsMd={2} gapX="gap-x-5" gapY="gap-y-5">
            <Card>
              <Title truncate={true}>
                Latency distribution (processing time)
              </Title>
              <Text height="h-14">
                This is how long it takes for the edge function to run the
                queries and return the result. Your internet connections{" "}
                <b>will not</b> influence these results.
              </Text>

              <AreaChart
                data={new Array(ATTEMPTS).fill(0).map((_, i) => {
                  return {
                    attempt: `#${i + 1}`,
                    Regional: data.regional[i]
                      ? data.regional[i].queryDuration
                      : null,
                    Global: data.global[i]
                      ? data.global[i].queryDuration
                      : null,
                  };
                })}
                dataKey="attempt"
                categories={["Global", "Regional"]}
                colors={["indigo", "cyan"]}
                valueFormatter={dataFormatter}
                marginTop="mt-6"
                yAxisWidth="w-12"
              />
            </Card>
            <Card>
              <Title truncate={true}>Latency distribution (end-to-end)</Title>
              <Text height="h-14">
                This is the total latency from the client&apos;s perspective. It
                considers the total roundtrip between browser and edge. Your
                internet connection and location <b>will</b> influence these
                results.
              </Text>

              <AreaChart
                data={new Array(ATTEMPTS).fill(0).map((_, i) => {
                  return {
                    attempt: `#${i + 1}`,
                    Regional: data.regional[i]
                      ? data.regional[i].elapsed
                      : null,
                    Global: data.global[i] ? data.global[i].elapsed : null,
                  };
                })}
                dataKey="attempt"
                categories={["Global", "Regional"]}
                colors={["indigo", "cyan"]}
                valueFormatter={dataFormatter}
                marginTop="mt-6"
                yAxisWidth="w-12"
              />
            </Card>
          </ColGrid>
        ) : null}
      </form>
    </main>
  );
}

// 16px github svg icon
const GitHubLogo = ({ width = 16, height = 16 }) => {
  return (
    <svg
      viewBox="0 0 1024 1024"
      width={width}
      height={height}
      fill="currentColor"
      style={{ display: "inline-block" }}
    >
      <path d="M512 0C229.25 0 0 229.25 0 512c0 226.25 146.688 418.125 350.156 485.812 25.594 4.688 34.938-11.125 34.938-24.625 0-12.188-0.469-52.562-0.719-95.312C242 908.812 211.906 817.5 211.906 817.5c-23.312-59.125-56.844-74.875-56.844-74.875-46.531-31.75 3.53-31.125 3.53-31.125 51.406 3.562 78.47 52.75 78.47 52.75 45.688 78.25 119.875 55.625 149 42.5 4.654-33 17.904-55.625 32.5-68.375C304.906 725.438 185.344 681.5 185.344 485.312c0-55.938 19.969-101.562 52.656-137.406-5.219-13-22.844-65.094 5.062-135.562 0 0 42.938-13.75 140.812 52.5 40.812-11.406 84.594-17.031 128.125-17.219 43.5 0.188 87.312 5.875 128.188 17.281 97.688-66.312 140.688-52.5 140.688-52.5 28 70.531 10.375 122.562 5.125 135.5 32.812 35.844 52.625 81.469 52.625 137.406 0 196.688-119.75 240-233.812 252.688 18.438 15.875 34.75 47 34.75 94.75 0 68.438-0.688 123.625-0.688 140.5 0 13.625 9.312 29.562 35.25 24.562 203.5-67.688 349.5-259.375 349.5-485.5 0-282.75-229.25-512-512-512z" />
    </svg>
  );
};

const dataFormatter = (number: number) =>
  `${Intl.NumberFormat("us").format(number).toString()}ms`;

function Code({ className = "", children }) {
  return (
    <code className={`bg-gray-200 text-sm p-1 rounded ${className}`}>
      {children}
    </code>
  );
}

function UpstashIcon() {
  return (
    <svg
      className="tr-flex-none tr-h-5 tr-w-5 tr-mr-3"
       viewBox="0 0 310 472"
      xmlns="http://www.w3.org/2000/svg"
      fill="rgb(156 163 175)"
    >
      <path d="M0.421875 412.975C78.5269 491.079 205.16 491.079 283.265 412.975C361.369 334.87 361.369 208.237 283.265 130.132L247.909 165.487C306.488 224.066 306.488 319.041 247.909 377.619C189.331 436.198 94.3559 436.198 35.7769 377.619L0.421875 412.975Z" />
      <path d="M71.1328 342.264C110.185 381.316 173.501 381.316 212.554 342.264C251.606 303.212 251.606 239.895 212.554 200.843L177.199 236.198C196.725 255.724 196.725 287.382 177.199 306.909C157.672 326.435 126.014 326.435 106.488 306.909L71.1328 342.264Z" />
      <path d="M353.974 59.421C275.869 -18.6835 149.236 -18.6835 71.1315 59.421C-6.97352 137.526 -6.97352 264.159 71.1315 342.264L106.486 306.909C47.9085 248.33 47.9085 153.355 106.486 94.777C165.065 36.198 260.04 36.198 318.618 94.777L353.974 59.421Z" />
      <path d="M283.264 130.132C244.212 91.08 180.894 91.08 141.842 130.132C102.789 169.185 102.789 232.501 141.842 271.553L177.197 236.198C157.671 216.672 157.671 185.014 177.197 165.487C196.723 145.961 228.381 145.961 247.908 165.487L283.264 130.132Z" />
    </svg>

  )
}

function XataIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="tr-flex-none tr-h-5 tr-w-5 tr-mr-3"
      width="20"
      height="20"
      viewBox="0 0 561 467"
      fill="rgb(156 163 175)"
    >
      <path d="M439.428 465.611C471.671 433.443 493.244 393.222 499.401 353.796C505.558 314.369 495.795 278.966 472.26 255.376L350.688 376.663L439.428 465.611Z" />
      <path d="M121.572 466.305C89.3288 434.138 67.756 393.917 61.5989 354.49C55.4418 315.063 65.2047 279.66 88.74 256.07L210.312 377.357L121.572 466.305Z" />
      <path d="M50.6715 122.184C50.7248 167.729 68.8685 211.387 101.111 243.554L101.114 243.551L222.671 364.823C254.838 332.58 272.879 288.88 272.826 243.335C272.773 197.79 254.629 154.132 222.386 121.964L222.383 121.967L100.827 0.695312C68.6597 32.9381 50.6182 76.6388 50.6715 122.184Z" />
      <path d="M510.327 121.488C510.274 167.033 492.13 210.692 459.887 242.859L459.884 242.855L338.328 364.127C306.161 331.884 288.119 288.183 288.172 242.638C288.226 197.094 306.369 153.435 338.612 121.268L338.616 121.271L460.172 0C492.339 32.2428 510.38 75.9434 510.327 121.488Z" />
    </svg>
  );
}
