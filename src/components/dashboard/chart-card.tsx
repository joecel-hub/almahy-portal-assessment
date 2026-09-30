import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ChartCardProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Accessible alternative: the same numbers as a table, one click away. */
  table: { columns: string[]; rows: (string | number)[][] };
};

/** A chart with its title, and a data table for screen readers and precise reading. */
export function ChartCard({ title, description, children, table }: ChartCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{title}</h2>
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-3">
        <figure aria-label={title}>{children}</figure>
        <details className="group text-sm">
          <summary className="w-fit cursor-pointer rounded text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50">
            Show data table
          </summary>
          <div className="mt-2 max-h-64 overflow-auto rounded-md border">
            <table className="w-full text-xs">
              <caption className="sr-only">{title}</caption>
              <thead className="bg-muted/50">
                <tr>
                  {table.columns.map((c, i) => (
                    <th key={c} scope="col" className={i === 0 ? "px-3 py-2 text-left font-medium" : "px-3 py-2 text-right font-medium"}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row) => (
                  <tr key={String(row[0])} className="border-t">
                    {row.map((cell, i) =>
                      i === 0 ? (
                        <th key={i} scope="row" className="px-3 py-1.5 text-left font-normal">
                          {cell}
                        </th>
                      ) : (
                        <td key={i} className="px-3 py-1.5 text-right tabular">
                          {cell}
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
