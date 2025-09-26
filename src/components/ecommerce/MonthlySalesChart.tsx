import Button from "../ui/button/Button";

export default function MonthlySalesChart() {
  const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Numeros</h3>
      <div className="flex flex-wrap justify-between gap-3 mt-5 max-w-full overflow-x-auto custom-scrollbar">
	      {numbers.map(num => (
	      	<Button className="flex flex-col" size="sm" variant="outline">
						<img className="w-14 h-18" src={`/images/numbers/${num}.png`} alt={`${num}`} />
	         	<p className="text-xl font-medium text-gray-800 dark:text-white/90">{num}</p>
	        </Button>
	      ))}
      </div>
    </div>
  );
}
