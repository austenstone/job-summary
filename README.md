# Action

Save job summaries as PDFs.

#### Usage
Call the action and it will save the job summary as a PDF called README.pdf

```yml
      - uses: austenstone/job-summary-to-pdf@main
```

## ➡️ Inputs
Various inputs are defined in [`action.yml`](action.yml):

| Name | Description | Default |
| --- | - | - |
| name | The name of the PDF file. | README |
| create-artifact | If the PDF will be saved as an artifact. | true |


## ⬅️ Outputs
| Name | Description |
| --- | - |
| job-summary | The full job summary as markdown. |
| path | The full path to the PDF file. |

## Further help
To get more help on the Actions see [documentation](https://docs.github.com/en/actions).
