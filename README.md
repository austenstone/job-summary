# Action

Get & Save job summaries as PDF, HTML, or Md.

> [!TIP]
> Try combining this with notification actions such as [send-email](https://github.com/marketplace/actions/send-email), [slack](https://github.com/marketplace/actions/slack-send), [teams](https://github.com/marketplace/actions/microsoft-teams-notification), [discord](https://github.com/marketplace/actions/discord-message-notify), etc.

#### Usage
Call the action and it will save the job summary as a PDF called job-summary.pdf

```yml
      - uses: austenstone/job-summary@v2.0
```

#### Usage to get only markdown summary

```yml
      - uses: austenstone/job-summary@v2.0
        id: job-summary
        with:
          create-pdf: false
      - run: echo "${{ steps.job-summary.outputs.job-summary }}"
```

<!-- #### Just get the Job Summary from URL
```yml
      - uses: austenstone/job-id@v1
        id: job-id
      - run: curl -s -H "Authorization: Bearer ${{ secrets.GITHUB_TOKEN }}" https://github.com/${{ github.repository }}/actions/runs/$GITHUB_RUN_ID/jobs/$GITHUB_JOB_ID/summary_raw
        env:
          GITHUB_JOB_ID: ${{ steps.job-id.outputs.job-id }}
``` -->

## ➡️ Inputs
Various inputs are defined in [`action.yml`](action.yml):

| Name | Description | Default | Required |
| --- | - | - | - |
| name | The name of the Md and PDF file. | README | false |
| create-pdf | Whether to create a PDF file. | true | false |
| create-pdf-artifact | If the PDF will be saved as an artifact. | true | false |
| create-md | Whether to create a markdown file. | true | false |
| create-md-artifact | If the markdown will be saved as an artifact. | true | false |

## ⬅️ Outputs
| Name | Description |
| --- | - |
| job-summary | The full job summary as markdown. |
| pdf-file | The path to the PDF file. |
| md-file | The path to the markdown file. |

## Further help
To get more help on the Actions see [documentation](https://docs.github.com/en/actions).
