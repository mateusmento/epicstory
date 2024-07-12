import type { Meta, StoryObj } from '@storybook/vue3'
import Button from './Button.vue'

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories
const meta = {
  title: 'shadcn-vue/Button',
  render: (args) => ({
    components: { Button },
    render() {
      return (
        <div class="flex flex-cols gap-3 items-center">
          <Button {...args} size="xs">
            extra small
          </Button>
          <Button {...args} size="sm">
            small
          </Button>
          <Button {...args} size="default">
            default
          </Button>
          <Button {...args} size="lg">
            really large
          </Button>
          <Button {...args} size="xl">
            extra extra lage
          </Button>
        </div>
      )
    }
  }),
  // This component will have an automatically generated docsPage entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['default', 'icon', 'xs', 'sm', 'lg'] },
    variant: {
      control: 'select',
      options: ['default', 'outline', 'destructive', 'link', 'text', 'ghost']
    }
  }
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>
/*
 *👇 Render functions are a framework specific feature to allow you control on how the component renders.
 * See https://storybook.js.org/docs/api/csf
 * to learn how to use render functions.
 */
export const Red: Story = {
  args: {
    class: 'bg-red-600 text-orange-100'
  }
}

export const Destructive: Story = {
  args: {
    variant: 'destructive'
  }
}
