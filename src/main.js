const { invoke } = window.__TAURI__.core;

let pidInputElement = null;
let activeSearchElement = null;
let applyConfigButton = null;
let memData = null;
let currentPid = null;
let memoryArray = [];
let timeLabel = [];
let time = 0;
let memChart = null;


// Configurations variables

let borderColor = "#e95420";
let backgroundChartColor = "#f1eeee";
let lineTension = 0.5;
let interval = 1000; // 1ms;
let chartType = 'line';

let intervalId = null;

function apply_configurations(){

  const borderColorEl = document.getElementById("border-color").value;
  const backgroundColorEl = document.getElementById("back-color").value;
  const tensionV = document.getElementById("tension-input").value;
  const intervalEl = document.getElementById("interval-speed").value;
  const typeV = document.getElementById("chart-type").value;
  
  if(borderColorEl != null){
    borderColor = borderColorEl;
  }
  if(backgroundColorEl != null){
    backgroundChartColor = backgroundColorEl;
  }

  if(typeV != 'line' && typeV != 'bar') return;
  chartType = typeV;
  if(intervalEl >= 100) {
    interval = intervalEl;
    if(intervalId != null){

      clearInterval(intervalId);
    }
    intervalId = setInterval(update_chart, interval);
  }
  interval = intervalEl;
  if(tensionV > 1) return;

  lineTension = tensionV;


  if(memChart != null){
    memChart.destroy();
  }

  render_mem_graph();

}



window.addEventListener("DOMContentLoaded", async () => {

  render_mem_graph();


  applyConfigButton = document.getElementById("apply-config");
  applyConfigButton.addEventListener("click", apply_configurations);
  pidInputElement = document.getElementById("pid-input");
  activeSearchElement = document.getElementById("search-btn");
  activeSearchElement.addEventListener("click", async () => {
    
        const value = pidInputElement.value;
        if(is_valid_pid(Number(value))) {
          /// number route 
          memData = await invoke("get_memory_usage", {pid: Number(value)});
          render_or_continue(memData, value, false);
        } else {
          ///text route 
          const pid = await invoke("get_pid_by_name", {name: value});
          console.log(pid);
          if(pid != 0) {
            currentPid = pid;
            memData = await invoke("get_memory_usage", {pid: pid});
            render_or_continue(memData, value, true);
          } else {
            iziToast.error({
              title: 'Error',
              message: 'Process with the given name was not found',
              position: 'topRight',
              timeout: 2000,
            });
        
          }
        }

        intervalId = setInterval(update_chart, interval);

    });

  });


  /**
 * If the given memData is usable, destroy the given chart and starts
 * The new render process.
 * 
 * @function
 * @returns {void} But calls a popup displaying success or failure.
 */
function render_or_continue(memoryData, currentValue, hasPid){
  if(memoryData != null || memoryData != undefined){ 
    if(memChart){
      memChart.destroy();
      memoryArray = [];
      timeLabel = [];
      time = 0;

    }

    currentPid = hasPid ? currentPid : Number(currentValue);
    render_mem_graph();
    iziToast.success({
      title: 'Success',
      message: `PID found: ${currentPid}. Starting to read data.`,
      position: 'topRight',
      timeout: 2000,
    });


  } else {
    iziToast.error({
      title: 'Error',
      message: 'Invalid PID or process not found',
      position: 'topRight',
      timeout: 2000,
    });
  }

}

/**
 * Asynchronously renders a memory usage graph using the Chart.js library.
 * 
 * This function initializes and displays a line chart on a canvas element 
 * with the ID 'mchart'. The chart visualizes memory usage data over time 
 * using the provided `timeLabel` and `memoryArray` variables.
 * 
 * @async
 * @function
 * @returns {Promise<void>} A promise that resolves when the chart is rendered.
 */
async function render_mem_graph(){
  
  const ctx = document.getElementById('mchart').getContext('2d');
  memChart = new Chart(ctx, {
      type: chartType, 
      data: {
          labels: timeLabel,
          datasets: [{      
              label: `Process: ${pidInputElement != null ? pidInputElement.value : "Idle"}`,
              data: memoryArray,
              borderColor: borderColor, //'rgba(233, 84, 32, 1)', 
              backgroundColor:  backgroundChartColor, //'#f1eeee',
              fill: true,
              tension: lineTension, 
          }]
      },
      options: {
          responsive: true,
          plugins: {
            // legend: {
            //     display: false
            // }
      }
  }});
}



const MAX_ARRAY_SIZE = 60;

/**
 * Asynchronously updates the memory usage chart by fetching memory data for a specific process ID,
 * appending the data to the memory array and time labels, and refreshing the chart display.
 *
 * @async
 * @function update_chart
 * @returns {Promise<void>} A promise that resolves when the chart update is complete.
 */
async function update_chart(){
  if(!is_valid_pid(currentPid)){
    return;
  }
  if(memoryArray.length > MAX_ARRAY_SIZE || timeLabel.length > MAX_ARRAY_SIZE){
    memoryArray.shift();
    timeLabel.shift();
  }
  time++;
  memData = await invoke("get_memory_usage", {pid: currentPid});
  
  memoryArray.push(memData);
  timeLabel.push(`${time}s`);
  memChart.update();


}


function is_valid_pid(pid){
  return Number.isInteger(pid) && pid > 0;
}
