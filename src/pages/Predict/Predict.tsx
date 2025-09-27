import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import HandCamera from "../../components/camera/HandCamera";

import {
  ArrowUpIcon
} from "../../icons";
import Badge from "../../components/ui/badge/Badge";



type TrainingProps = {
	type: string;
	arr: (number | string)[];
	op: boolean;
};

export default function Predict({type, arr=[], op=false}: TrainingProps) {
	const ops = {
		"S": "+",
		"R": "-",
		"M": "x",
		"D": "/",
		"I": "="
	};
	let folder = "";

	if (type === "Numeros") {
		folder = "numbers";
	} else {
		folder = "letters";
	}

  return (
    <>
      <PageMeta
        title="Entrenamiento"
        description="..."
      />
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 space-y-6 xl:col-span-7">
          <div className={`grid ${type === "Vocales" ? "" : "grid-cols-2"} md:gap-6`}>
	          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
	            <div className="flex justify-between h-12 rounded-xl dark:bg-gray-800">
	            	<p className="flex flex-col text-xl dark:text-white">Recolecte los datos necesarios<span className="text-sm font-light text-gray-500">Ponga la mano frente a la camara</span></p>
	            </div>

	            <div className=" mt-5">
	              <Badge color="success">
	                <ArrowUpIcon />
	                11.01%
	              </Badge>
	              <div className="w-full h-3 bg-gray-100 rounded-xl mt-1.5"></div>
	            </div>
	          </div>
						{type !== "Vocales" && (
							<>
			          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
			            <div className="flex justify-between h-12 rounded-xl dark:bg-gray-800">
			            	<p className="flex flex-col text-xl dark:text-white">Recolecte los datos necesarios<span className="text-sm font-light text-gray-500">Ponga la mano frente a la camara</span></p>
			            </div>

			            <div className=" mt-5">
			              <Badge color="success">
			                <ArrowUpIcon />
			                11.01%
			              </Badge>
			              <div className="h-3 bg-gray-100 rounded-xl mt-1.5"></div>
			            </div>
			          </div>
			          <div className="flex justify-between items-center col-span-full rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 md:gap-5">
									<p></p>
									{type !== "Numeros" && (
										<div className="flex md:gap-3">
						      		<Button size="sm" variant="primary">Espacio</Button>
						      		<Button size="sm" variant="primary">Borrar</Button>
										</div>
									)}
								</div>
							</>
						)}
	        </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{type}</h3>
            <div className="flex flex-wrap justify-between gap-3 mt-5 max-w-full overflow-x-auto custom-scrollbar">
							{arr.length > 0 && (
					      arr.map(val => (
					      	<Button className="flex flex-col" size="sm" variant="outline">
										<img className="w-14 h-18 dark:[filter:invert(100%)_sepia(0%)_saturate(7466%)_hue-rotate(83deg)_brightness(99%)_contrast(102%)]" src={`/images/${folder}/${val}.png`} alt={`${val}`} />
					         	<p className="text-xl font-medium text-gray-800 dark:text-white/90">{val}</p>
					        </Button>
					      ))
            	)}
							{arr.length > 0 && op && Object.entries(ops).map(([key, value]) => (
								<Button className="flex flex-col" size="sm" variant="outline">
									<img className="w-14 h-18 dark:[filter:invert(100%)_sepia(0%)_saturate(7466%)_hue-rotate(83deg)_brightness(99%)_contrast(102%)]" src={`/images/letters/${key}.png`} alt="op" />
									<p className="text-xl font-medium text-gray-800 dark:text-white/90">{value}</p>
				        </Button>
							))}
							{arr.length === 0 && (
								<p className="text-sm font-light text-gray-500">Tabla vacia :)</p>
							)}
            </div>
          </div>
        </div>

        <div className="col-span-12 xl:col-span-5">
        	<div className="h-200 rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/[0.03]">
        		<HandCamera mode="prediction" />
        	</div>
        </div>
      </div>
    </>
  );
}
