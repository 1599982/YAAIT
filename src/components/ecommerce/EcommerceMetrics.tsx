import {
  ArrowUpIcon
} from "../../icons";
import Badge from "../ui/badge/Badge";
import Button from "../ui/button/Button";

export default function EcommerceMetrics() {
  return (
    <div className="grid grid-cols-1 gap-4 md:gap-6">
      {/* <!-- Metric Item Start --> */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex justify-between h-12 rounded-xl dark:bg-gray-800">
        	<p className="flex flex-col text-xl">Recolecte los datos necesarios<span className="text-sm font-light text-gray-500">Ponga la mano frente a la camara</span></p>
        	<div className="flex gap-2">
         		<Button size="sm" variant="primary">Prediccion</Button>
         		<Button size="sm" variant="primary">Recolectar</Button>
         	</div>
        </div>

        <div className=" mt-5">
          <Badge color="success">
            <ArrowUpIcon />
            11.01%
          </Badge>
          <div className="w-full h-3 bg-gray-100 rounded-xl mt-1.5"></div>
        </div>
      </div>
      {/* <!-- Metric Item End --> */}
    </div>
  );
}
