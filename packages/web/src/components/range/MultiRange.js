import React, { Component } from 'react';

import { updateQuery, setQueryOptions, setCustomQuery } from '@appbaseio/reactivecore/lib/actions';
import hoistNonReactStatics from 'hoist-non-react-statics';
import {
	isEqual,
	checkValueChange,
	checkSomePropChange,
	getClassName,
	updateCustomQuery,
} from '@appbaseio/reactivecore/lib/utils/helper';
import { componentTypes } from '@appbaseio/reactivecore/lib/utils/constants';
import types from '@appbaseio/reactivecore/lib/utils/types';

import Title from '../../styles/Title';
import Container from '../../styles/Container';
import { UL, Checkbox } from '../../styles/FormControlList';
import { connect, parseValueArray } from '../../utils';
import PreferencesConsumer from '../basic/PreferencesConsumer';
import ComponentWrapper from '../basic/ComponentWrapper';

class MultiRange extends Component {
	constructor(props) {
		super(props);

		const defaultValue = props.defaultValue || props.value;
		const value = props.selectedValue || defaultValue || [];
		const currentValue = MultiRange.parseValue(value, props);
		const selectedValues = {};
		currentValue.forEach((item) => {
			selectedValues[item.label] = true;
		});

		this.state = {
			currentValue,
			// selectedValues hold the selected items as keys for O(1) complexity
			selectedValues,
		};

		this.type = 'range';

		// Set custom query in store
		updateCustomQuery(props.componentId, props, currentValue);
		const hasMounted = false;

		if (value.length) {
			this.selectItem({
				item: value,
				isDefaultValue: true,
				props,
				hasMounted,
			});
		}
	}

	componentDidUpdate(prevProps) {
		checkSomePropChange(this.props, prevProps, ['dataField', 'nestedField', 'aggregationSize'], () => {
			this.updateQuery(this.state.currentValue, this.props);
		});

		if (!isEqual(this.props.value, prevProps.value)) {
			this.selectItem({
				item: this.props.value,
				isDefaultValue: true,
			});
		} else if (
			!isEqual(this.state.currentValue, this.props.selectedValue)
			&& !isEqual(this.props.selectedValue, prevProps.selectedValue)
		) {
			const { value, onChange } = this.props;

			const processSelectedValues = this.props.selectedValue
				? this.props.selectedValue.map((item) => {
					if (typeof item === 'object' && 'label' in item) {
						return item.label;
					}
					return item;
				  })
				: null;
			if (value === undefined) {
				this.selectItem({ item: processSelectedValues, isDefaultValue: true });
			} else if (onChange) {
				this.selectItem({
					item: this.props.selectedValue || null,
				});
			} else {
				const selectedValuesArray = Object.keys(this.state.selectedValues);

				this.selectItem({
					item: selectedValuesArray,
					isDefaultValue: true,
				});
			}
		}
	}

	// parses range label to get start and end
	static parseValue = (value, props) =>
		(value ? props.data.filter(item => value.includes(item.label)) : null);

	static defaultQuery = (value, props) => ({
		query: {
			queryFormat: props.queryFormat,
			dataField: props.dataField,
			value,
			showMissing: props.showMissing,
		},
	});

	selectItem = ({
		item, isDefaultValue = false, props = this.props, hasMounted = true,
	}) => {
		let { currentValue, selectedValues } = this.state;
		if (!item) {
			currentValue = [];
			selectedValues = {};
		} else if (isDefaultValue) {
			// checking if the items in defaultSeleted exist in the data prop
			currentValue = MultiRange.parseValue(item, props);
			selectedValues = item.reduce((accObj, valKey) => {
				// eslint-disable-next-line no-param-reassign
				accObj[valKey] = true;
				return accObj;
			}, {});
		} else if (selectedValues[item]) {
			currentValue = currentValue.filter(value => value.label !== item);
			const { [item]: del, ...selected } = selectedValues;
			selectedValues = selected;
		} else {
			const currentItem = props.data.find(value => item === value.label);
			currentValue = [...currentValue, currentItem];
			selectedValues = { ...selectedValues, [item]: true };
		}

		const performUpdate = () => {
			const handleUpdates = () => {
				this.updateQuery(currentValue, props);
				if (props.onValueChange) props.onValueChange(currentValue);
			};

			if (hasMounted) {
				this.setState(
					{
						currentValue,
						selectedValues,
					},
					handleUpdates,
				);
			} else {
				handleUpdates();
			}
		};

		checkValueChange(props.componentId, currentValue, props.beforeValueChange, performUpdate);
	};

	updateQuery = (value, props) => {
		const { customQuery } = props;
		const query = MultiRange.defaultQuery(value, props);
		let customQueryOptions;
		if (customQuery) {
			updateCustomQuery(props.componentId, props, value);
		}

		props.setQueryOptions(props.componentId, customQueryOptions, false);
		props.updateQuery({
			componentId: props.componentId,
			query,
			value,
			label: props.filterLabel,
			showFilter: props.showFilter,
			URLParams: props.URLParams,
			componentType: componentTypes.multiRange,
		});
	};

	handleClick = (e) => {
		const { value, onChange } = this.props;

		const { value: rangeValue } = e.target;
		if (value === undefined) {
			this.selectItem({ item: rangeValue });
		} else if (onChange) {
			onChange(parseValueArray(this.props.value, rangeValue));
		}
	};

	render() {
		return (
			<Container style={this.props.style} className={this.props.className}>
				{this.props.title && (
					<Title className={getClassName(this.props.innerClass, 'title') || null}>
						{this.props.title}
					</Title>
				)}
				<UL
					className={getClassName(this.props.innerClass, 'list') || null}
					role="listbox"
					aria-label={`${this.props.componentId}-items`}
				>
					{this.props.data.map((item) => {
						const isChecked = !!this.state.selectedValues[item.label];
						return (
							<li
								key={item.label}
								className={`${isChecked ? 'active' : ''}`}
								role="option"
								aria-checked={isChecked}
								aria-selected={isChecked}
							>
								<Checkbox
									className={
										getClassName(this.props.innerClass, 'checkbox') || null
									}
									id={`${this.props.componentId}-${item.label}`}
									name={`${this.props.componentId}-${item.label}`}
									value={item.label}
									onChange={this.handleClick}
									checked={isChecked}
									show={this.props.showCheckbox}
								/>
								<label
									className={getClassName(this.props.innerClass, 'label') || null}
									htmlFor={`${this.props.componentId}-${item.label}`}
								>
									<span>{item.label}</span>
								</label>
							</li>
						);
					})}
				</UL>
			</Container>
		);
	}
}

MultiRange.propTypes = {
	updateQuery: types.funcRequired,
	selectedValue: types.selectedValue,
	setQueryOptions: types.funcRequired,
	setCustomQuery: types.funcRequired,
	// component props
	beforeValueChange: types.func,
	className: types.string,
	componentId: types.stringRequired,
	compoundClause: types.compoundClause,
	customQuery: types.func,
	data: types.data,
	dataField: types.stringRequired,
	defaultValue: types.stringArray,
	value: types.stringArray,
	filterLabel: types.filterLabel,
	innerClass: types.style,
	nestedField: types.string,
	onQueryChange: types.func,
	onValueChange: types.func,
	onChange: types.func,
	placeholder: types.string,
	react: types.react,
	showCheckbox: types.boolRequired,
	showFilter: types.bool,
	style: types.style,
	supportedOrientations: types.supportedOrientations,
	title: types.title,
	URLParams: types.bool,
	includeNullValues: types.bool,
	index: types.string,
	endpoint: types.endpoint,
};

MultiRange.defaultProps = {
	className: null,
	showCheckbox: true,
	showFilter: true,
	style: {},
	URLParams: false,
	includeNullValues: false,
};

// Add componentType for SSR
MultiRange.componentType = componentTypes.multiRange;

const mapStateToProps = (state, props) => ({
	selectedValue: state.selectedValues[props.componentId]
		? state.selectedValues[props.componentId].value
		: null,
});

const mapDispatchtoProps = dispatch => ({
	setCustomQuery: (component, query) => dispatch(setCustomQuery(component, query)),
	updateQuery: updateQueryObject => dispatch(updateQuery(updateQueryObject)),
	setQueryOptions: (...args) => dispatch(setQueryOptions(...args)),
});

const ConnectedComponent = connect(
	mapStateToProps,
	mapDispatchtoProps,
)(props => <MultiRange ref={props.myForwardedRef} {...props} />);

// eslint-disable-next-line
const ForwardRefComponent = React.forwardRef((props, ref) => (
	<PreferencesConsumer userProps={props}>
		{preferenceProps => (
			<ComponentWrapper
				{...preferenceProps}
				internalComponent
				componentType={componentTypes.multiRange}
			>
				{
					componentProps =>
						(<ConnectedComponent
							{...preferenceProps}
							{...componentProps}
							myForwardedRef={ref}
						/>)
				}
			</ComponentWrapper>
		)}
	</PreferencesConsumer>
));
hoistNonReactStatics(ForwardRefComponent, MultiRange);

ForwardRefComponent.displayName = 'MultiRange';
export default ForwardRefComponent;
