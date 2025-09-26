import EcommerceMetrics from "../../components/ecommerce/EcommerceMetrics";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";

type TrainingProps = {
	type: string;
	arr: (number | string)[];
};

export default function Training({type, arr}: TrainingProps) {
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
          <EcommerceMetrics />

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{type}</h3>
            <div className="flex flex-wrap justify-between gap-3 mt-5 max-w-full overflow-x-auto custom-scrollbar">
				      {arr.map(val => (
				      	<Button className="flex flex-col" size="sm" variant="outline">
									<img className="w-14 h-18" src={`/images/${folder}/${val}.png`} alt={`${val}`} />
				         	<p className="text-xl font-medium text-gray-800 dark:text-white/90">{val}</p>
				        </Button>
				      ))}
            </div>
          </div>
        </div>

        <div className="col-span-12 xl:col-span-5">
        	<div className="h-200 rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/[0.03]">
        	</div>
        </div>
      </div>
    </>
  );
}
