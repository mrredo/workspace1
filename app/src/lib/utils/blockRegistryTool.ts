import javascriptGenerator from '$lib/javascript';
import Blockly from "blockly/core";
import BlocklyOG from "blockly"
import Dabase from "$lib/blocks/js/dabase";

/**
 * List of constants for different output types.
 */
const OutputType = {
    STRING: ["String", "Text"],
    NUMBER: ["Number"],
    BOOLEAN: ["Boolean", "Bool"],
    ARRAY: ["List", "Array"],
    OBJECT: ["Object", "JSON"],
    ANY: null,//any block
    DISCORD: {
        SERVER: ["Server"],
        CHANNEL: ["Channel"],
        MESSAGE: ["Message"],
        MEMBER: ["Member", "User"],
    },
    MESSAGE: {

        BUILDERS: {
            MESSAGE: ["MessageBuilder"],
            EMBED: ["EmbedBuilder"]
        }
    }
}

/**
 * List of constants for different block shapes.
 */
const BlockShape = {
    STATEMENT: "statement",//Block shape for a statement block. Not actually required, but keeps code consistent.
    EVENT: "event",//Block shape for a floating block with an input inside.Can be replaced with FLOATING, but keeps code consistent.
    TERMINAL: "terminal",//Block shape for a block with no blocks allowed to attach after.
    FLOATING: "floating",//Block shape for a block that cannot have any parent blocks.
    TOPPER: "topper",//Block shape for a block that cannot have any blocks attached before it.
    CUSTOM: "custom",//Custom block shape, can be used if "manual" is used for the block.
}

/**
 * List of constants for different input shapes / fields.
 */
const InputShape = {
    VALUE: "input_value", //Input shape for inputs that allow output blocks.
    DUMMY: "input_dummy", //Can be used for seperating content on a block by a new line.
    SPACE: "input_space",//Similar to DUMMY.Can be used for seperating content on a block.
    IMAGE: "field_image",//Not actually an input, but an image.
    ANGLE: "field_angle",//Angle field for directional inputs.
    CHECKBOX: "field_checkbox",//Checkbox field usually for toggles.
    COLOR: "field_colour",//Color field.
    MENU: "field_dropdown",//Dropdown menu field with options.
    SERIALIZABLE_LABEL: "field_label_serializable",//Label that serializes to the project.
    NUMBER: "field_number",//Number field. Used for restricting to certain numbers.
    TEXT: "field_input",//Text field. Used if blocks shouldnt be used here,but text can still be input here.
    MULTILINE_TEXT: "field_multilinetext",//Multi-line text field.Similar to TEXT, but new line characters are allowed.
    VARIABLE: "field_variable",//Variable field. Similar to MENU, but the options are all variables.
    DISCORD: {
        SERVER: "field_server",
        CHANNEL: "field_channel",
        MESSAGE: "field_message"
    }
}

class BlocklyTool {
    // doesnt like that the BlockSet class is missing stuff
    // because its a base block set that should be edited
    // so, just use "any" typing for now
    registerFromBlockset(blockset: any) {
        let num=1
        const registry = blockset.getRegistry();
        const idPrefix: string = `${registry.id}_`;
        if (!registry.blocks) {
            return; // we are done here if theres no blocks
        }
        for (const block of registry.blocks) {
            num++
            if (typeof block.manual === 'string') {
                // manual block, dont do anything actually
                // just run the function
                blockset[block.manual](Blockly, javascriptGenerator);
                continue; // move to the next block
            }
            // extract inputs from the block
            const blockDisplayContent: any = {
                message0: '',
                args0: []
            };
            // set block arguments if its non existent
            if (!block.arguments) {
                block.arguments = {};
            }
            const blockArguments = block.arguments;
            const rawArrayText: Array<string> = Array.isArray(block.text) ? block.text : [block.text];
            // each new line is an "input_dummy" argument
            let idxa = 1;
            const arrayText: Array<string> = rawArrayText.map(text => {
                const newText = text.replace(/\n/gmi, (match) => {
                    // add to arguments
                    const currentIdx = idxa;
                    const id = `DUMMYNEWLINE_${currentIdx}`;
                    // add to arguments
                    blockArguments[id] = {
                        type: "input_dummy"
                    };
                    idxa++;
                    // replaces the first entry
                    return match.replace('\n', `[${id}]`);
                });
                return newText;
            });
            // add branches
            if (block.branches) {
                for (let idx = 0; idx < block.branches; idx++) {
                    const id = `BRANCH${idx + 1}`;
                    // add to arguments
                    blockArguments[id] = {
                        type: "input_statement"
                    };
                }
                // now add them to arrayText
                for (let idx = 0; idx < block.branches; idx++) {
                    const id = `[BRANCH${idx + 1}]`;
                    // insert with splice (we can just insert the ID)
                    // each added element changes the index, so account for that
                    const index = (idx * 2) + 1;
                    arrayText.splice(index, 0, id);
                }
            }
            // now parse this and add to message0 and args0
            const blockMessage = arrayText.join(' ');
            let idx = 0;
            // parse blockMessage and add it to message0
            blockDisplayContent.message0 = String(blockMessage).replace(/(\[\S+\])+/gmi, (match) => {
                idx++;
                // reads the text inside of the brackets
                const inputName: string = String(match).replace(/[\[\]]*/gmi, "");
                // add to arguments
                // get the argument data
                const realArgument = block.arguments[inputName] ?
                    block.arguments[inputName]
                    // if not defined, default to blank input_value
                    : { type: "input_value" };
                blockDisplayContent.args0.push({
                    // adds all argument data like type
                    ...realArgument,
                    // add argument name
                    name: inputName
                });
                // return the %1 thing blockly wants
                return "%" + idx;
            });
            // //get keys of each argument
            // let keys = Object.keys(block.arguments)
            // //loop trough add block parameter to function
            // for (const key of keys) {
            //     let argument = block.arguments[key]
            //     if(argument.options && argument.options instanceof Function) {
            //         console.log(argument)
            //     }
            // }

            // actually define the block
            Blockly.Blocks[`${idPrefix}${block.func}`] = {
                init: function () {
                    this.jsonInit({
                        message0: blockDisplayContent.message0,
                        args0: blockDisplayContent.args0,
                        inputsInline: block.inline,
                        output: block.output,
                        tooltip: block.tooltip ? block.tooltip : "",
                        helpUrl: block.url ? block.url : "",
                        mutator: block.mutator ? block.mutator : "",
                    });
                    if (block.shape) {
                        // apply block shape
                        switch (block.shape) {
                            case BlockShape.STATEMENT:
                                this.setPreviousStatement(true);
                                this.setNextStatement(true);
                                break;
                            case BlockShape.EVENT:
                            case BlockShape.FLOATING:
                                // dont change, already floating
                                break;
                            case BlockShape.TERMINAL:
                                this.setPreviousStatement(true);
                                break;
                            case BlockShape.TOPPER:
                                // opposite of terminal
                                this.setNextStatement(true);
                                break;
                        }
                    }
                    this.setColour(registry.color);
                    if (block.color) {
                        this.setColour(block.color);
                    }
                }
            };
            // define JS gen
            javascriptGenerator.forBlock[`${idPrefix}${block.func}`] = function (exportblock: Blockly.Block) {
                const args: any = {};
                for (const argument of blockDisplayContent.args0) {
                    // args0 is an array of blockly argument objects
                    // the [INPUT] -> INPUT names are saved in the "name" property
                    const argName = argument.name;
                    switch (argument.type) {
                        case 'input_value':
                            args[argName] = javascriptGenerator.valueToCode(exportblock, argName, javascriptGenerator.ORDER_ATOMIC);
                            break;
                        case 'input_statement':
                            args[argName] = javascriptGenerator.statementToCode(exportblock, argName);
                            break;
                        case 'input_dummy':
                        case 'input_space':
                            args[argName] = "";
                            break;
                        default:
                            args[argName] = exportblock.getFieldValue(argName);
                            break;
                    }
                }
                const returnValue = blockset[block.func](args);
                // if a non-tuple was returned as an output block,
                // we need to convert it to one
                if (typeof block.output !== 'undefined' && !Array.isArray(returnValue)) {
                    // default is ORDER_NONE, meaning () around the whole thing
                    return [returnValue, javascriptGenerator.ORDER_NONE];
                }
                return returnValue;
            };

            //Mutator generator
            /*
            There are 2 mutator types:
            - Where you can drag blocks
            - Where with a checked field you can show and hide a field
            */
            if(block.mutator) {

                // console.log(block.mutator)
                let BorderFields: string[] = ["FIELD1"]
                let BorderTypes: string[] = ["string"]
                let inputs: boolean[] = [true]

                // for (const mutatorField of block.mutatorFields) {
                //     BorderFields.push(mutatorField.name)
                //     BorderTypes.push(mutatorField.type)
                //     inputs.push(mutatorField.shown)
                //
                // }
                let blockid = `${idPrefix}${block.func}e`
                //second idPrefix is added for mutators only
                Blockly.Blocks[blockid] = {
                    init: function () {
                        // this.jsonInit(block.mutatorData)
                        this.setColour("#CECDCE");
                        this.setTooltip("");
                        this.setHelpUrl("");
                    }
                }
                //boilerplate code(Dont worry about it)
                const BORDER_MUTATOR_MIXIN = {
                    inputs_: inputs,


                    mutationToDom: function() {
                        if (!this.inputs_) {
                            return null;
                        }
                        const container = document.createElement("mutation");
                        for (let i = 0; i < this.inputs_.length; i++) {
                            if (this.inputs_[i]) container.setAttribute(BorderFields[i], this.inputs_[i] as any)
                        }
                        return container;
                    },

                    domToMutation: function(xmlElement: any) {
                        for (let i = 0; i < this.inputs_.length; i++) {
                            this.inputs_[i] = xmlElement.getAttribute(BorderFields[i].toLowerCase()) == "true";
                        }
                        this.updateShape_();
                    },

                    decompose: function(workspace: any) {
                        const containerBlock = workspace.newBlock(blockid);
                        for (let i = 0; i < this.inputs_.length; i++) {
                            containerBlock.appendDummyInput()
                                .setAlign(Blockly.ALIGN_RIGHT)
                                .appendField(BlocklyOG.Msg[BorderFields[i]])
                                .appendField(new Blockly.FieldCheckbox(this.inputs_[i] ? "TRUE" : "FALSE"), BorderFields[i].toUpperCase());
                        }
                        containerBlock.initSvg();
                        return containerBlock;
                    },

                    compose: function(containerBlock: any) {
                        // Set states
                        for (let i = 0; i < this.inputs_.length; i++) {
                            this.inputs_[i] = (containerBlock.getFieldValue(BorderFields[i].toUpperCase()) == "TRUE");
                        }
                        this.updateShape_();
                    },
                    getInput: function (...args: any): any {},
                    removeInput: function (...args: any): any {},
                    appendValueInput: function (...args: any): any {},

                    updateShape_: function() {
                        for (let i = 0; i < this.inputs_.length; i++) {
                            if (this.getInput(BorderFields[i].toUpperCase())) this.removeInput(BorderFields[i].toUpperCase());
                        }
                        for (let i = 0; i < this.inputs_.length; i++) {
                            if (this.inputs_[i]) {
                                this.appendValueInput(BorderFields[i].toUpperCase())
                                    .setCheck(BorderTypes[i])
                                    .setAlign(Blockly.ALIGN_RIGHT)
                                    .appendField(BlocklyOG.Msg[BorderFields[i]]);
                            }
                        }
                    }
                };
                Blockly.Extensions.registerMutator(blockid, BORDER_MUTATOR_MIXIN, () => {}, [""]);
            }
        }
    }
}

export {
    OutputType,
    BlockShape,
    InputShape,
    BlocklyTool
};

// const Blockly = require("blockly/core");
// /* eslint-disable */
// module.exports.createBlock = (data) => {
//     // data = {
//     //     id: "blobkaname",
//     //     text: "among us [DUMMY] [TROLOLO]",
//     //     color: "#ff0000",
//     //     tooltip: "abc",
//     //     url: "abc",
//     //     output: module.exports.OutputType.STRING,
//     //     inline: true,
//     //     hidden: false,
//     //     inputs: {
//     //         DUMMY: { type: "input_dummy" },
//     //         TROLOLO: { type: "input_value", check: module.exports.OutputType.STRING }
//     //     },
//     //     export: (block, args) => {
//     //         return `banana ${args.TROLOLO}`
//     //     }
//     // }
//     if (!data.id) throw new Error("Block ID cannot be undefined");
//     if (!data.text) throw new Error("Block text cannot be undefined");
//     const inputNames = [];
//     let i = 0;
//     const message = String(data.text).replace(/(\[\S+\])+/gmi, (match) => {
//         i++;
//         inputNames.push(String(match).replace(/[\[\]]*/gmi, ""));
//         return "%" + i;
//     });
//     const argumentss = [];
//     inputNames.forEach(name => {
//         argumentss.push({
//             type: data.inputs[name].type,
//             check: data.inputs[name].check,
//             options: data.inputs[name].options,
//             name: name
//         });
//     });
//     Blockly.Blocks[data.id] = {
//         init: function () {
//             this.jsonInit(
//                 data.floating == true ? {
//                     "message0": message,
//                     "args0": argumentss,
//                     "inputsInline": data.inline,
//                     "colour": data.color,
//                     "output": data.output,
//                     "tooltip": data.tooltip ? data.tooltip : "",
//                     "helpUrl": data.url ? data.url : ""
//                 } : {
//                     "message0": message,
//                     "args0": argumentss,
//                     "inputsInline": data.inline,
//                     "colour": data.color,
//                     "output": data.output,
//                     "previousStatement": null,
//                     "nextStatement": null,
//                     "tooltip": data.tooltip ? data.tooltip : "",
//                     "helpUrl": data.url ? data.url : ""
//                 }
//             );
//         },
//         isHiden: data.hidden
//     };
//     Blockly.JavaScript[data.id] = function (block) {
//         const args = {};
//         inputNames.forEach(input => {
//             switch (data.inputs[input].type) {
//                 case 'input_value':
//                     args[input] = Blockly.JavaScript.valueToCode(block, input, Blockly.JavaScript.ORDER_ATOMIC);
//                     break;
//                 case 'input_statement':
//                     args[input] = Blockly.JavaScript.statementToCode(block, input);
//                     break;
//                 case 'input_dummy':
//                     args[input] = "";
//                     break;
//                 case 'input_space':
//                     args[input] = "";
//                     break;
//                 default:
//                     args[input] = block.getFieldValue(input);
//                     break;
//             }
//         });
//         if (data.output == null) return data.export(block, args);
//         return [data.export(block, args), Blockly.JavaScript.ORDER_NONE];
//     };
// };