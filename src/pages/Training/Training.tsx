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
};

export default function Training({type, arr=[]}: TrainingProps) {
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
	        <div className="grid grid-cols-1 gap-4 md:gap-6">
	          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
	            <div className="flex justify-between h-12 rounded-xl dark:bg-gray-800">
	            	<p className="flex flex-col text-xl dark:text-white">Recolecte los datos necesarios<span className="text-sm font-light text-gray-500">Ponga la mano frente a la camara</span></p>
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
	        </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{type}</h3>
            <div className="flex flex-wrap justify-between gap-3 mt-5 max-w-full overflow-x-auto custom-scrollbar">
				      {arr.length > 0 ? (arr.map(val => (
				      	<Button className="w-20 h-30 flex flex-col" size="sm" variant="outline">
									<img className="w-18 h-18 dark:[filter:invert(100%)_sepia(0%)_saturate(7466%)_hue-rotate(83deg)_brightness(99%)_contrast(102%)]" src={`/images/${folder}/${val}.png`} alt={`${val}`} />
				         	<p className="text-xl font-medium text-gray-800 dark:text-white/90">{val}</p>
				        </Button>
				      ))) : (
				      	<Button className="w-20 h-30 flex flex-col" size="sm" variant="outline">
				         	<p className="text-5xl font-medium text-gray-800 dark:text-white/90">+</p>
				        </Button>
				      )}
            </div>
          </div>
        </div>

        <div className="col-span-12 xl:col-span-5">
        	<div className="h-200 rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/[0.03]">
        		<HandCamera mode="training" />
        	</div>
        </div>
      </div>
    </>
  );
}
